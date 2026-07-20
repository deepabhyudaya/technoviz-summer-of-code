"use client";

import { useFormState } from "react-dom";
import { useEffect, useState } from "react";
import {
  updateCourse, deleteCourse,
  updateSection, deleteSection,
  updateLecture, deleteLecture,
  adminDeleteCourse, adminExpireCourse, unexpireCourse,
  createCourse, createSection
} from "@/lib/courseActions";
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, Check, X, ShieldAlert, Ban, RotateCcw, FileEdit, BookOpen } from "lucide-react";
import { useRef } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/animate-ui/components/radix/dialog";

function useActionToast(state: { success: boolean; error: boolean }, successMsg: string) {
  useEffect(() => {
    if (state.success) toast.success(successMsg);
    if (state.error) toast.error("Something went wrong.");
  }, [state, successMsg]);
}

export function DeleteCourseBtn({ courseId }: { courseId: number }) {
  const [state, action] = useFormState(deleteCourse, { success: false, error: false });
  useActionToast(state, "Course deleted.");
  return (
    <form action={action}>
      <input type="hidden" name="id" value={courseId} />
      <button type="submit" className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-destructive/60 text-destructive text-[12px] font-semibold hover:bg-destructive/10 transition-all">
        <Trash2 size={13} /> Delete
      </button>
    </form>
  );
}

export function EditCourseForm({ courseId, currentTitle, currentDesc, currentSlug }: { courseId: number; currentTitle: string; currentDesc: string; currentSlug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(updateCourse, { success: false, error: false });
  useEffect(() => {
    if (state.success) { toast.success("Course updated."); setOpen(false); }
    if (state.error) toast.error("Failed to update course.");
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-border text-foreground text-[12px] font-semibold hover:bg-muted transition-all">
        <Pencil size={13} /> Edit
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 mt-3 p-4 bg-muted/40 rounded-[10px] border border-border">
      <input type="hidden" name="id" value={courseId} />
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-foreground">Title</label>
        <input name="title" defaultValue={currentTitle} required className="p-2 text-[13px] rounded-[6px] bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-foreground">Description</label>
        <textarea name="description" defaultValue={currentDesc} required rows={2} className="p-2 text-[13px] rounded-[6px] bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-foreground">URL Slug</label>
        <input name="slug" defaultValue={currentSlug} required className="p-2 text-[13px] rounded-[6px] bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90">
          <Check size={13} /> Save
        </button>
        <button type="button" onClick={() => setOpen(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] border border-border text-foreground text-[12px] hover:bg-muted">
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteSectionBtn({ sectionId }: { sectionId: number }) {
  const [state, action] = useFormState(deleteSection, { success: false, error: false });
  useActionToast(state, "Section deleted.");
  return (
    <form action={action}>
      <input type="hidden" name="id" value={sectionId} />
      <button type="submit" className="p-1.5 rounded-[6px] text-destructive hover:bg-destructive/10 transition-all" title="Delete section">
        <Trash2 size={14} />
      </button>
    </form>
  );
}

export function EditSectionForm({ sectionId, currentTitle }: { sectionId: number; currentTitle: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(updateSection, { success: false, error: false });
  useEffect(() => {
    if (state.success) { toast.success("Section updated."); setOpen(false); }
    if (state.error) toast.error("Failed to update section.");
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="p-1.5 rounded-[6px] text-muted-foreground hover:bg-muted transition-all" title="Edit section">
        <Pencil size={14} />
      </button>
    );
  }
  return (
    <form action={action} className="flex gap-2 items-center mt-2">
      <input type="hidden" name="id" value={sectionId} />
      <input name="title" defaultValue={currentTitle} required className="flex-1 p-2 text-[13px] rounded-[6px] bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20" />
      <button type="submit" className="p-1.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90"><Check size={14} /></button>
      <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-[6px] border border-border hover:bg-muted"><X size={14} /></button>
    </form>
  );
}

export function DeleteLectureBtn({ lectureId }: { lectureId: number }) {
  const [state, action] = useFormState(deleteLecture, { success: false, error: false });
  useActionToast(state, "Lecture deleted.");
  return (
    <form action={action}>
      <input type="hidden" name="id" value={lectureId} />
      <button type="submit" className="p-1 rounded text-destructive hover:bg-destructive/10 transition-all" title="Delete lecture">
        <Trash2 size={13} />
      </button>
    </form>
  );
}

export function EditLectureForm({ lectureId, currentTitle, currentUrl }: { lectureId: number; currentTitle: string; currentUrl: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(updateLecture, { success: false, error: false });
  useEffect(() => {
    if (state.success) { toast.success("Lecture updated."); setOpen(false); }
    if (state.error) toast.error("Failed to update lecture.");
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="p-1 rounded text-muted-foreground hover:bg-muted transition-all" title="Edit lecture">
        <Pencil size={13} />
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2 mt-2 p-3 bg-muted/30 rounded-[8px] border border-border">
      <input type="hidden" name="id" value={lectureId} />
      <input name="title" defaultValue={currentTitle} required placeholder="Lecture title" className="p-2 text-[12px] rounded-[6px] bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20" />
      <input name="videoUrl" defaultValue={currentUrl} required placeholder="YouTube URL" className="p-2 text-[12px] rounded-[6px] bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20" />
      <div className="flex gap-2">
        <button type="submit" className="p-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"><Check size={13} /></button>
        <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded border border-border hover:bg-muted"><X size={13} /></button>
      </div>
    </form>
  );
}

export function SectionToggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground mb-1">
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? "Collapse" : "Expand"} lectures
      </button>
      {open && children}
    </div>
  );
}

export function AdminDeleteCourseBtn({ courseId }: { courseId: number }) {
  const [state, action] = useFormState(adminDeleteCourse, { success: false, error: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success("Course permanently deleted.");
      setOpen(false);
    }
    if (state.error) toast.error("Something went wrong.");
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-destructive text-destructive-foreground text-[12px] font-semibold hover:bg-destructive/90 transition-all"
          title="Admin: force delete this course"
        >
          <Trash2 size={13} /> Delete
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Force Delete Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this course? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="px-4 py-2 text-sm rounded-lg bg-muted text-foreground hover:bg-muted/80 border border-border">
              Cancel
            </button>
          </DialogClose>
          <form action={action}>
            <input type="hidden" name="id" value={courseId} />
            <button type="submit" className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Delete
            </button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminExpireCourseBtn({ courseId }: { courseId: number }) {
  const [state, action] = useFormState(adminExpireCourse, { success: false, error: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success("Course marked as expired.");
      setOpen(false);
    }
    if (state.error) toast.error("Something went wrong.");
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors text-primary-foreground"
          title="Admin: mark as expired"
        >
          <Ban size={14} strokeWidth={2} />
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Expire Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this course as expired? It will no longer be enrollable by students.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="px-4 py-2 text-sm rounded-lg bg-muted text-foreground hover:bg-muted/80 border border-border">
              Cancel
            </button>
          </DialogClose>
          <form action={action}>
            <input type="hidden" name="id" value={courseId} />
            <button type="submit" className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Confirm Expire
            </button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnexpireCourseBtn({ courseId }: { courseId: number }) {
  const [state, action] = useFormState(unexpireCourse, { success: false, error: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success("Course un-expired successfully.");
      setOpen(false);
    }
    if (state.error) toast.error("Something went wrong.");
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-all"
          title="Un-expire course"
        >
          <RotateCcw size={13} /> Un-expire
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Un-expire Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to un-expire this course? It will be marked as approved and students will be able to enroll again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="px-4 py-2 text-sm rounded-lg bg-muted text-foreground hover:bg-muted/80 border border-border">
              Cancel
            </button>
          </DialogClose>
          <form action={action}>
            <input type="hidden" name="id" value={courseId} />
            <button type="submit" className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Confirm Un-expire
            </button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddCourseForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createCourse, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast.success("Course draft created!");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="bg-card border border-border rounded-[12px] p-6 shadow-sm sticky top-6">
      <h2 className="text-[18px] font-bold text-foreground mb-4">New Course</h2>
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-foreground">Course Title</label>
          <input
            name="title"
            required
            className="p-2.5 text-[13px] rounded-[8px] text-foreground bg-transparent border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="e.g. Advanced Mathematics"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-foreground">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            className="p-2.5 text-[13px] rounded-[8px] text-foreground bg-transparent border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            placeholder="What will students learn?"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground py-2.5 px-4 rounded-[8px] text-[13px] font-bold hover:opacity-90 transition-all shadow-sm active:scale-[0.98]"
        >
          Draft Course
        </button>
      </form>
    </div>
  );
}

export function AddSectionForm({ courseId, nextOrder }: { courseId: number, nextOrder: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createSection, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast.success("Section added!");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-3 items-center p-4 bg-muted/30 rounded-[10px] border border-dashed border-border">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="order" value={nextOrder} />
      <input
        name="title"
        required
        className="flex-1 p-2.5 text-[13px] rounded-[8px] bg-card text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="New Section Title"
      />
      <button
        type="submit"
        className="bg-card text-foreground py-2.5 px-5 rounded-[8px] text-[13px] font-bold border border-border hover:bg-muted transition-all shadow-sm whitespace-nowrap"
      >
        + Add Section
      </button>
    </form>
  );
}
