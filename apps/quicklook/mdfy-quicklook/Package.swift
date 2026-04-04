// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "mdfy-quicklook",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "mdfy-quicklook",
            dependencies: [],
            path: "Sources/PreviewExtension",
            resources: [
                .copy("template.html")
            ]
        )
    ]
)
