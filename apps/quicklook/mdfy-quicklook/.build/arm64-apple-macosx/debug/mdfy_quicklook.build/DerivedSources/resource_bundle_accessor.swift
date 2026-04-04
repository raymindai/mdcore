import Foundation

extension Foundation.Bundle {
    static let module: Bundle = {
        let mainPath = Bundle.main.bundleURL.appendingPathComponent("mdfy-quicklook_mdfy-quicklook.bundle").path
        let buildPath = "/Users/hyunsangcho/Desktop/Projects/mdcore/apps/quicklook/mdfy-quicklook/.build/arm64-apple-macosx/debug/mdfy-quicklook_mdfy-quicklook.bundle"

        let preferredBundle = Bundle(path: mainPath)

        guard let bundle = preferredBundle ?? Bundle(path: buildPath) else {
            // Users can write a function called fatalError themselves, we should be resilient against that.
            Swift.fatalError("could not load resource bundle: from \(mainPath) or \(buildPath)")
        }

        return bundle
    }()
}