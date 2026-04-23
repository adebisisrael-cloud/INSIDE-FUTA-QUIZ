import { createClient } from "@supabase/supabase-js";

const SB_URL = "https://viislvqotvivkxcdbtyd.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpaXNsdnFvdHZpdmt4Y2RidHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDY0NzksImV4cCI6MjA5MjUyMjQ3OX0.1xio9peC2hjyMsjUG5b2rMYiU3BW-SaYaObkq4a8vJQ";

export const supabase = createClient(SB_URL, SB_KEY);

export type SubmissionDetail = {
  answers: {
    q: string;
    o: string[];
    a: number;
    chosen: number | null;
    e: string;
  }[];
  violations: { type: string; at: string }[];
  forced?: boolean;
};

export type Submission = {
  id?: number | string;
  name: string;
  whatsapp: string;
  school: string;
  dept: string;
  score: string;
  points: number;
  start_time: string;
  finish_time: string;
  details?: SubmissionDetail | null;
};
