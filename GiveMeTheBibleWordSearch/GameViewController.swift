import UIKit
import WebKit
import UniformTypeIdentifiers

/// Hosts the bundled web app (the `www` folder) in a WKWebView and provides the native pieces
/// the app asks for through `window.iOS`: printing, saving exported highlights to Files, and sharing.
final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var webView: WKWebView!

    // Page background colours (Daylight theme), so the safe-area edges match the app.
    private let paper = UIColor(red: 0xEC / 255, green: 0xEF / 255, blue: 0xE8 / 255, alpha: 1)

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()            // keeps profiles, saved puzzles, records and highlights
        let bridge = """
        window.iOS = {
          print: function () { window.webkit.messageHandlers.bc.postMessage({ act: 'print' }); },
          saveText: function (name, mime, text) { window.webkit.messageHandlers.bc.postMessage({ act: 'save', name: name, mime: mime, text: text }); },
          shareText: function (title, text) { window.webkit.messageHandlers.bc.postMessage({ act: 'share', title: title, text: text }); }
        };
        """
        config.userContentController.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.add(self, name: "bc")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = paper
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false

        let root = UIView()
        root.backgroundColor = paper
        root.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        // Edge to edge: the page fills the whole screen and keeps its content clear of the notch and
        // home bar itself (CSS env(safe-area-inset-*), with viewport-fit=cover in index.html).
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            webView.topAnchor.constraint(equalTo: root.topAnchor),
            webView.bottomAnchor.constraint(equalTo: root.bottomAnchor)
        ])
        view = root
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let www = Bundle.main.url(forResource: "www", withExtension: nil) else { return }
        webView.loadFileURL(www.appendingPathComponent("index.html"), allowingReadAccessTo: www)
        NotificationCenter.default.addObserver(self, selector: #selector(appWillResignActive),
                                               name: UIApplication.willResignActiveNotification, object: nil)
    }

    @objc private func appWillResignActive() {
        // Same hook the Android version uses: saves the open puzzle when the app goes to the background.
        webView.evaluateJavaScript("window.onAndroidPause && window.onAndroidPause()", completionHandler: nil)
    }

    // Full screen: the clock/battery bar is hidden while the app is open.
    override var prefersStatusBarHidden: Bool { true }
    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }

    // MARK: - Messages from the page

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let act = body["act"] as? String else { return }
        switch act {
        case "print":
            printPage()
        case "save":
            saveText(name: body["name"] as? String ?? "Bible-highlights.txt", text: body["text"] as? String ?? "")
        case "share":
            shareText(body["text"] as? String ?? "")
        default:
            break
        }
    }

    private func printPage() {
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .general
        info.jobName = "Give Me the Bible Word Search"
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printFormatter = webView.viewPrintFormatter()   // uses the page's print layout
        if UIDevice.current.userInterfaceIdiom == .pad {
            controller.present(from: CGRect(x: view.bounds.midX, y: 60, width: 1, height: 1), in: view, animated: true, completionHandler: nil)
        } else {
            controller.present(animated: true, completionHandler: nil)
        }
    }

    private func saveText(name: String, text: String) {
        let safe = name.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(safe)
        do {
            try text.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            return
        }
        let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
        present(picker, animated: true)
    }

    private func shareText(_ text: String) {
        let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let pop = sheet.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = []
        }
        present(sheet, animated: true)
    }

    // Keep navigation inside the bundled app.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, url.isFileURL || url.scheme == "about" || url.scheme == "blob" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
        }
    }
}
