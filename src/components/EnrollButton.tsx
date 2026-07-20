"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import { enrollCourse } from "@/lib/courseActions";
import { toast } from "react-toastify";

export function EnrollButton({ courseId }: { courseId: number }) {
  const [state, action] = useFormState(enrollCourse, { success: false, error: false });

  useEffect(() => {
    if (state.success) toast.success("Enrolled successfully! Start learning  ");
    if (state.error) toast.error("Enrollment failed. You may already be enrolled.");
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-[8px] text-[13px] font-bold hover:opacity-90 transition-all active:scale-[0.98]"
      >
        Enroll Now
      </button>
    </form>
  );
}
