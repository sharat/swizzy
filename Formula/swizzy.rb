class Swizzy < Formula
  desc "A modern CLI tool that beautifies SwiftLint JSON output into readable formats"
  homepage "https://github.com/sharat/swizzy"
  url "https://github.com/sharat/swizzy/releases/download/v2.5.0/swizzy-macos-arm64"
  version "2.5.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/sharat/swizzy/releases/download/v2.5.0/swizzy-macos-arm64"
    else
      url "https://github.com/sharat/swizzy/releases/download/v2.5.0/swizzy-macos-x64"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/sharat/swizzy/releases/download/v2.5.0/swizzy-linux-arm64"
    else
      url "https://github.com/sharat/swizzy/releases/download/v2.5.0/swizzy-linux-x64"
    end
  end

  def install
    if OS.mac? && Hardware::CPU.arm?
      bin.install "swizzy-macos-arm64" => "swizzy"
    elsif OS.mac? && Hardware::CPU.intel?
      bin.install "swizzy-macos-x64" => "swizzy"
    elsif OS.linux? && Hardware::CPU.arm?
      bin.install "swizzy-linux-arm64" => "swizzy"
    else
      bin.install "swizzy-linux-x64" => "swizzy"
    end
  end

  test do
    system "#{bin}/swizzy", "--version"
  end
end
