@echo off
echo Setting up Vercel environment variables...

echo.
echo Adding TOGETHER_API_KEY...
echo a45eb554baea41e18ecde3186eb6aebf300dc0d2ed162ca61f8d0e1e5221a93a | npx vercel env add TOGETHER_API_KEY production

echo.
echo Adding YOUTUBE_API_KEY...
echo AIzaSyAMNwr4XjyxopCVSTV6bF7o0sElzJpyN5M | npx vercel env add YOUTUBE_API_KEY production

echo.
echo Adding ADMIN_PASSWORD...
echo change_me_admin | npx vercel env add ADMIN_PASSWORD production

echo.
echo Done! Environment variables have been added to Vercel production.
echo Now triggering a new deployment...
npx vercel --prod

pause
