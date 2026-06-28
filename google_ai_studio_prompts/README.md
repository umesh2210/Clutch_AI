# 🚀 Google AI Studio Prompt Import & Testing Guide

This directory contains the exported prompt configurations used in **ClutchAI**'s AI Engine (`src/gemini.ts`). You can import these directly into [Google AI Studio](https://aistudio.google.com/) to iterate, test, and tune the model's instructions and schemas.

---

## 📂 Exported Prompts

1. **[Kavi AI Coach Chat](file:///c:/Users/umesh/Desktop/reminder%20app/google_ai_studio_prompts/kavi_coach_chat.json)**: Handles the main conversational companion loop. Employs a complex system instruction that enforces structured JSON actions (like creating tasks, rescheduling events, or managing trips).
2. **[Task Understanding Parser](file:///c:/Users/umesh/Desktop/reminder%20app/google_ai_studio_prompts/task_understanding.json)**: Parses natural language input (e.g. *"I have a database exam next Friday at 2 PM, takes 6 hours to prepare"*) into a structured task with a deadline, consequence, and milestones.
3. **[Syllabus & Image Analysis](file:///c:/Users/umesh/Desktop/reminder%20app/google_ai_studio_prompts/syllabus_image_analysis.json)**: Multimodal parser that reads uploaded images (syllabi, email screenshots, whiteboard notes) to extract title, deadline, and estimated work hours.

---

## 📥 How to Import into Google AI Studio

Google AI Studio allows you to import prompts via the prompt selection view:

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Click **Create New Prompt** or go to your prompt library list.
3. Look for the **Import Prompt** option or the **"+"** upload button in the prompt interface.
4. Select the corresponding `.json` file from this folder.
5. Google AI Studio will automatically pre-populate:
   - The **System Instructions**
   - The **Model selection** (`Gemini 2.5 Flash`)
   - The **Generation Parameters** (Temperature, Top-P, etc.)
   - The **Response Schema** (JSON schema enforcing Structured Output)
   - Sample input/output examples (under the chat contents area)

---

## 🔬 Tweak & Test inside AI Studio

* **Structured Outputs**: Under the **Run Settings** (or the model configurations pane on the right-hand side), you will see that `Response MIME Type` is set to `application/json` with the JSON Schema prefilled. Any output generated will strictly adhere to the exact format needed by the application engine.
* **Prompt Iteration**: You can modify the text in the **System Instructions** to change the tone of Kavi (e.g., make him more aggressive, add new features, or alter the scheduling heuristics) and immediately test it with test inputs in the chat panel.

---

## 🔌 Connecting Google AI Studio to the Live App

Once you're satisfied with your prompt behavior:
1. In Google AI Studio, click **Get API Key** in the top left and generate a key.
2. In the root of your `reminder app` directory, create or edit the file named **`.env`**.
3. Add your key as follows:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
4. Restart your Vite development server (`npm run dev`). ClutchAI will automatically detect the key, transition from **Offline Heuristic Mode** to **Live Gemini AI Mode**, and begin using these prompts dynamically!
