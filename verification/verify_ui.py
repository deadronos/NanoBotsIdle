from playwright.sync_api import sync_playwright

def verify_ui_split(page):
    page.goto("http://localhost:3000")

    # Wait for the UI to load
    page.wait_for_selector("text=VOXEL WALKER")

    # Take a screenshot of the main UI
    page.screenshot(path="verification/main_ui.png")

    # Open Shop Modal
    page.click("text=Research Lab")

    # Wait for Shop Modal
    page.wait_for_selector("text=Research & Development")

    # Take a screenshot of the Shop Modal
    page.screenshot(path="verification/shop_modal.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_ui_split(page)
        finally:
            browser.close()
