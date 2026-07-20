"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition, useEffect } from "react";
import { GripVertical, Play } from "lucide-react";
import { reorderLectures } from "@/lib/courseActions";
import { EditLectureForm, DeleteLectureBtn } from "@/components/BuilderClient";

type Lecture = {
  id: number;
  title: string;
  videoUrl: string;
  order: number;
};

function SortableLecture({ lecture }: { lecture: Lecture }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lecture.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-[8px] p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none"
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </button>
          <Play size={12} className="text-muted-foreground shrink-0" />
          <span className="text-[12px] font-medium text-foreground truncate">
            {lecture.title}
          </span>
          <span className="text-[11px] text-muted-foreground/60 truncate max-w-[160px] hidden sm:block">
            {lecture.videoUrl}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <EditLectureForm
            lectureId={lecture.id}
            currentTitle={lecture.title}
            currentUrl={lecture.videoUrl}
          />
          <DeleteLectureBtn lectureId={lecture.id} />
        </div>
      </div>
    </div>
  );
}

export function DraggableLectureList({
  lectures,
}: {
  sectionId: number;
  lectures: Lecture[];
}) {
  const [items, setItems] = useState<Lecture[]>(lectures);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(lectures);
  }, [lectures]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((l) => l.id === active.id);
    const newIndex = items.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("orderedIds", JSON.stringify(reordered.map((l) => l.id)));
      await reorderLectures({ success: false, error: false }, fd);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((lecture) => (
            <SortableLecture key={lecture.id} lecture={lecture} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
