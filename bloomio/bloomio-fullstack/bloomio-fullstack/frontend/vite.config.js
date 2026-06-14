import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://eazdyadzsekevyseylug.supabase.co"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhemR5YWR6c2VrZXZ5c2V5bHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTI0OTgsImV4cCI6MjA5Njc4ODQ5OH0.xwx0w8l5Q0w5DkwhYjujRK_gSudO6U3wMdTMrpac6no"),
  },
});