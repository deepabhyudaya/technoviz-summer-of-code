"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo, useState } from "react";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";

const localizer = momentLocalizer(moment);

interface LessonEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  teacherName: string;
  subjectName: string;
  className: string;
}

const BigCalendar = ({
  data,
}: {
  data: LessonEvent[];
}) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedLesson, setSelectedLesson] = useState<LessonEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const schedule = useMemo(
    () => adjustScheduleToCurrentWeek(data, currentDate),
    [data, currentDate]
  );

  const { min, max } = useMemo(() => {
    const defaultMin = new Date(2025, 0, 1, 8, 0, 0);
    const defaultMax = new Date(2025, 0, 1, 18, 0, 0);
    if (!data.length) return { min: defaultMin, max: defaultMax };

    let minMinutes = 24 * 60;
    let maxMinutes = 0;

    for (const event of data) {
      const start = event.start.getHours() * 60 + event.start.getMinutes();
      const end = event.end.getHours() * 60 + event.end.getMinutes();
      if (start < minMinutes) minMinutes = start;
      if (end > maxMinutes) maxMinutes = end;
    }

    minMinutes = Math.max(0, minMinutes - 60);
    maxMinutes = Math.min(24 * 60 - 1, maxMinutes + 60);

    return {
      min: new Date(2025, 0, 1, Math.floor(minMinutes / 60), minMinutes % 60, 0),
      max: new Date(2025, 0, 1, Math.floor(maxMinutes / 60), maxMinutes % 60, 0),
    };
  }, [data]);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  const handleSelectEvent = (event: LessonEvent) => {
    setSelectedLesson(event);
    setIsDialogOpen(true);
  };

  return (
    <div className="h-full w-full bg-card text-card-foreground">
      <Calendar
        localizer={localizer}
        events={schedule}
        startAccessor="start"
        endAccessor="end"
        views={["work_week", "day"]}
        view={view}
        style={{ height: "100%", width: "100%" }}
        onView={handleOnChangeView}
        onNavigate={setCurrentDate}
        onSelectEvent={handleSelectEvent}
        date={currentDate}
        min={min}
        max={max}
        step={30}
        timeslots={2}
        components={{
          event: ({ event }: any) => (
            <div className="flex flex-col h-full p-1 overflow-hidden pointer-events-none">
              <span className="font-bold text-[12px] leading-tight break-words uppercase">
                {event.title}
              </span>
              <span className="text-[10px] opacity-60 mt-auto font-medium">
                {moment(event.start).format("h:mm")} - {moment(event.end).format("h:mm")}
              </span>
            </div>
          ),
        }}
        formats={{
          timeGutterFormat: (date, culture, localizer) =>
            localizer!.format(date, "H:mm", culture),
        }}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background text-foreground border-border rounded-xl shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-border p-6 bg-muted/20">
            <DialogTitle className="text-xl font-medium tracking-tight">
              {selectedLesson?.title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider mt-1 font-semibold">
              Lesson Information
            </DialogDescription>
          </DialogHeader>

          {selectedLesson && (
            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Teacher</span>
                <span className="text-sm font-medium text-foreground">{selectedLesson.teacherName}</span>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Branch</span>
                  <span className="text-sm font-medium text-foreground">{selectedLesson.className}</span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Subject</span>
                  <span className="text-sm font-medium text-foreground">{selectedLesson.subjectName}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-5 border-t border-border">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Schedule</span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-semibold tracking-tight text-foreground">
                    {moment(selectedLesson.start).format("HH:mm")} - {moment(selectedLesson.end).format("HH:mm")}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground tracking-tight uppercase">
                    {moment(selectedLesson.start).format("dddd")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .rbc-calendar {
          background-color: transparent !important;
          color: inherit !important;
          font-family: inherit !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .rbc-time-view, .rbc-month-view {
          border-color: hsl(var(--border)) !important;
        }
        .rbc-timeslot-group {
          min-height: 50px !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        .rbc-off-range-bg {
          background: hsl(var(--muted) / 0.3) !important;
        }
        .rbc-today {
          background-color: hsl(var(--muted) / 0.5) !important;
        }
        .rbc-toolbar {
          padding: 1rem !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          margin-bottom: 0 !important;
          background: hsl(var(--muted) / 0.2);
        }
        .rbc-toolbar button {
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
          background: transparent !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          border-radius: 0.375rem !important;
          padding: 0.375rem 0.75rem !important;
          transition: all 0.2s !important;
        }
        .rbc-toolbar button:hover, .rbc-toolbar button.rbc-active {
          background-color: hsl(var(--foreground)) !important;
          color: hsl(var(--background)) !important;
        }
        .rbc-event {
          background-color: hsl(var(--foreground)) !important;
          color: hsl(var(--background)) !important;
          border-radius: 4px !important;
          border: none !important;
          padding: 6px !important;
          opacity: 0.9 !important;
          transition: opacity 0.2s !important;
        }
        .rbc-event:hover {
          opacity: 1 !important;
        }
        .rbc-header {
          border-bottom: 1px solid hsl(var(--border)) !important;
          padding: 12px 0 !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          letter-spacing: 0.1em !important;
          color: hsl(var(--muted-foreground)) !important;
          background: hsl(var(--muted) / 0.3);
        }
        .rbc-label {
          padding: 0 12px !important;
          font-size: 10px !important;
          color: hsl(var(--muted-foreground)) !important;
          font-weight: 500 !important;
        }
        .rbc-day-bg + .rbc-day-bg, .rbc-header + .rbc-header, .rbc-time-header-content {
          border-color: hsl(var(--border)) !important;
        }
        .rbc-time-content {
          border-top: 1px solid hsl(var(--border)) !important;
        }
        .rbc-time-gutter .rbc-timeslot-group {
          border-color: transparent !important;
        }
        .rbc-allday-cell {
          border-color: hsl(var(--border)) !important;
        }
      `}</style>
    </div>
  );
};

export default BigCalendar;
