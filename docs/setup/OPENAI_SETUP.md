# OpenAI API Setup Instructions

## Quick Setup

1. **Get your OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key or copy an existing one

2. **Add the API key to your .env file:**
   - Open the `.env` file in the root directory
   - Replace `your_openai_api_key_here` with your actual API key:
   ```
   REACT_APP_OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Restart the development server:**
   - Stop the current server (Ctrl+C)
   - Run `./start.sh` again

## Test the Chat Feature

1. Navigate to the Task Maker page
2. Use the chat sidebar on the left
3. Type any message and press Enter
4. The AI should respond directly through the OpenAI API

## Important Notes

- The API key is used directly in the browser (for development only)
- In production, API calls should go through your backend
- Make sure your OpenAI account has sufficient credits
- The chat sends your message directly to OpenAI and displays the response

## Troubleshooting

- If you see "Invalid OpenAI API key" - check your .env file
- If you see "OpenAI API quota exceeded" - check your billing on OpenAI platform
- Make sure to restart the server after changing the .env file