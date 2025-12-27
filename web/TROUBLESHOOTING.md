# Troubleshooting Localhost Issues

## Server is Running

The development server should be running on **http://localhost:3000**

## Steps to Fix:

1. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

2. **If the page doesn't load**, check:
   - Make sure the dev server is running (run `npm run dev` in terminal)
   - Check the terminal for any error messages
   - Try clearing your browser cache or using an incognito window

3. **If you see errors in the browser console**:
   - Press F12 to open Developer Tools
   - Check the Console tab for error messages
   - Check the Network tab to see if files are loading

4. **Common Issues**:

   **Missing Supabase Environment Variables** (Non-critical):
   - If you see warnings about Supabase, create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   - The app will still run without these, but authentication and database features won't work.

   **Port Already in Use**:
   - If port 3000 is already in use, Next.js will automatically use the next available port (3001, 3002, etc.)
   - Check the terminal output to see which port it's using

5. **Restart the Server**:
   - Stop the server (Ctrl+C in terminal)
   - Run `npm run dev` again
   - Clear `.next` folder if needed: `rm -rf .next` (or delete it manually)

## Expected Behavior:

- Home page should load with the landing page, navbar, and flashcards
- Navigation should work between pages
- Toast notifications should appear (top-right corner)
- All pages should be responsive on mobile

## Still Having Issues?

Check the browser console (F12) for specific error messages and share them.

