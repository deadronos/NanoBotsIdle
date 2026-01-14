from playwright.sync_api import sync_playwright

def verify_ui_enhancements():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (using the port from log: 3000)
        try:
            page.goto("http://localhost:3000", timeout=30000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            browser.close()
            return

        # Wait for canvas to load
        try:
            page.wait_for_selector("canvas", timeout=30000)
            print("Canvas found.")
        except:
             print("Canvas not found")

        # Wait a bit for 3D world to render
        page.wait_for_timeout(5000)

        # Take screenshot
        page.screenshot(path="verification/visual_enhancements.png")
        print("Screenshot saved to verification/visual_enhancements.png")

        browser.close()

if __name__ == "__main__":
    verify_ui_enhancements()
