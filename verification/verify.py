from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000")
            page.goto("http://localhost:3000")

            # Wait for canvas to be present (indicating 3D scene loaded)
            print("Waiting for canvas...")
            page.wait_for_selector("canvas", timeout=10000)

            # Wait a bit for chunks to load
            print("Waiting for chunks to load...")
            page.wait_for_timeout(5000)

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/verification.png")
            print("Screenshot saved to verification/verification.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
