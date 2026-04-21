# Setup Instructions

## 📦 Installation Complete!

Your Daily Memory PWA has been scaffolded successfully. Here's what you need to do next:

## 🎨 Generate PWA Icons

The app needs PNG icons for full PWA support. You have two options:

### Option 1: Use Online Tool (Recommended)
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload the `/public/icon.svg` file
3. Generate icons for sizes: 192x192 and 512x512
4. Download and place them in `/public/` folder as:
   - `pwa-192x192.png`
   - `pwa-512x512.png`

### Option 2: Manual Creation
1. Open `/public/generate-icons.html` in your browser
2. Open browser console (F12)
3. The script will automatically generate and download the icons
4. Move the downloaded files to `/public/` folder

### Option 3: Use Existing Images
If you have your own icon design:
1. Create 192x192px and 512x512px PNG images
2. Save them as `pwa-192x192.png` and `pwa-512x512.png` in `/public/`

## 🚀 Running the App

```bash
# Navigate to project directory
cd daily-memory

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

## 📱 Testing PWA Features

### Desktop (Chrome/Edge)
1. Open the app in browser
2. Look for the install icon (⊕) in the address bar
3. Click to install as desktop app

### Mobile
1. Open the app in mobile browser
2. Tap the browser menu (⋮)
3. Select "Add to Home Screen" or "Install App"

## 🔧 Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

The production files will be in the `/dist` folder.

## 📝 Next Steps

1. ✅ Generate PWA icons (see above)
2. ✅ Test the app locally
3. ✅ Add your first flashcard
4. ✅ Test the review system
5. 🚀 Deploy to hosting (Vercel, Netlify, etc.)

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Drag and drop the /dist folder to Netlify
```

### GitHub Pages
```bash
# Update vite.config.ts base to match your repo name
# Then build and deploy
npm run build
```

## 🐛 Troubleshooting

### Icons not showing
- Make sure PNG icons are in `/public/` folder
- Clear browser cache and reload
- Check browser console for errors

### PWA not installable
- Must be served over HTTPS (or localhost)
- Icons must be present
- Manifest must be valid

### LocalStorage not persisting
- Check browser privacy settings
- Ensure cookies/storage is enabled
- Try a different browser

## 📚 Learn More

- [Vite Documentation](https://vitejs.dev/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [SM-2 Algorithm](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm)
- [Framer Motion](https://www.framer.com/motion/)

## 💡 Tips

- Review cards daily for best results
- Add cards regularly to build your knowledge base
- Use clear, concise questions and answers
- The SM-2 algorithm adapts to your learning pace

Enjoy learning with จำทุกวัน! 🧠✨
