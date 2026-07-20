"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  selectedText?: string;
}

export default function LinkDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedText,
}: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConfirm(url.trim());
      setUrl("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {selectedText && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm font-medium">{selectedText}</p>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium mb-2">
                URL
              </label>
              <input
                ref={inputRef}
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-foreground/20"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Link
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
