from playwright.sync_api import sync_playwright
import time

def verify_voxels(page):
    print("Navigating to http://localhost:3000")
    page.goto("http://localhost:3000")
    # Wait for canvas
    print("Waiting for canvas...")
    page.wait_for_selector("canvas", timeout=30000)
    # Wait for game to load/render
    print("Waiting for render...")
    time.sleep(5)
    print("Taking screenshot...")
    page.screenshot(path="verification/voxel_layer.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_voxels(page)
        finally:
            browser.close()
