import { useCallback, useEffect, useRef, useState } from "react";
import {
  minutesToTimeValue,
  parseTimeToMinutes,
  snapMinutes,
  TIME_SNAP_MINUTES,
} from "../../shared/lib/time";

type PointerDrag = {
  workDate: string;
  anchorMinutes: number;
  currentMinutes: number;
};

type ResizeDrag = {
  shiftId: string;
  workDate: string;
  startMinutes: number;
  currentMinutes: number;
};

type MoveDrag = {
  shiftId: string;
  fromWorkDate: string;
  workDate: string;
  durationMinutes: number;
  startMinutes: number;
  grabOffsetMinutes: number;
};

function minutesFromPointer(
  clientY: number,
  rect: DOMRect,
  rangeStart: number,
  rangeEnd: number,
): number {
  const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  const raw = rangeStart + ratio * (rangeEnd - rangeStart);
  return snapMinutes(raw);
}

function workDateAtPointerX(
  clientX: number,
  columnRefs: Map<string, HTMLDivElement>,
): string | null {
  for (const [workDate, element] of columnRefs.entries()) {
    const rect = element.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      return workDate;
    }
  }
  return null;
}

type ShiftPlacement = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
};

export function useTimelineDrag({
  rangeStartMinutes,
  rangeEndMinutes,
  shifts,
  onCreateRange,
  onResizeEnd,
  onMoveEnd,
}: {
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  shifts: ShiftPlacement[];
  onCreateRange: (payload: {
    workDate: string;
    startTime: string;
    endTime: string;
  }) => void;
  onResizeEnd: (payload: { shiftId: string; endTime: string }) => boolean | void;
  onMoveEnd: (payload: {
    shiftId: string;
    workDate: string;
    startTime: string;
    endTime: string;
  }) => boolean | void;
}) {
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const moveCommittedRef = useRef(false);
  const resizeCommittedRef = useRef(false);
  const [createDrag, setCreateDrag] = useState<PointerDrag | null>(null);
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);
  const [moveDrag, setMoveDrag] = useState<MoveDrag | null>(null);

  const setColumnRef = useCallback(
    (workDate: string, node: HTMLDivElement | null) => {
      if (node) {
        columnRefs.current.set(workDate, node);
      } else {
        columnRefs.current.delete(workDate);
      }
    },
    [],
  );

  const beginCreate = useCallback(
    (workDate: string, clientY: number) => {
      const el = columnRefs.current.get(workDate);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const anchor = minutesFromPointer(
        clientY,
        rect,
        rangeStartMinutes,
        rangeEndMinutes,
      );
      setCreateDrag({ workDate, anchorMinutes: anchor, currentMinutes: anchor });
    },
    [rangeEndMinutes, rangeStartMinutes],
  );

  const beginResize = useCallback(
    (
      shift: { id: string; startTime: string; endTime: string },
      workDate: string,
      clientY: number,
    ) => {
      const el = columnRefs.current.get(workDate);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const parsed = minutesFromPointer(
        clientY,
        rect,
        rangeStartMinutes,
        rangeEndMinutes,
      );
      resizeCommittedRef.current = false;
      const startMinutes = parseTimeToMinutes(shift.startTime);
      setResizeDrag({
        shiftId: shift.id,
        workDate,
        startMinutes,
        currentMinutes: Math.max(startMinutes + TIME_SNAP_MINUTES, parsed),
      });
    },
    [rangeEndMinutes, rangeStartMinutes],
  );

  const resetDrag = useCallback(() => {
    moveCommittedRef.current = false;
    resizeCommittedRef.current = false;
    setCreateDrag(null);
    setResizeDrag(null);
    setMoveDrag(null);
  }, []);

  useEffect(() => {
    if (!moveDrag || !moveCommittedRef.current) return;
    const shift = shifts.find((row) => row.id === moveDrag.shiftId);
    if (!shift) return;
    if (
      String(shift.workDate) === moveDrag.workDate &&
      parseTimeToMinutes(shift.startTime) === moveDrag.startMinutes
    ) {
      moveCommittedRef.current = false;
      setMoveDrag(null);
    }
  }, [moveDrag, shifts]);

  useEffect(() => {
    if (!resizeDrag || !resizeCommittedRef.current) return;
    const shift = shifts.find((row) => row.id === resizeDrag.shiftId);
    if (!shift) return;
    if (parseTimeToMinutes(shift.endTime) === resizeDrag.currentMinutes) {
      resizeCommittedRef.current = false;
      setResizeDrag(null);
    }
  }, [resizeDrag, shifts]);

  const beginMove = useCallback(
    (
      shift: { id: string; startTime: string; endTime: string },
      workDate: string,
      clientX: number,
      clientY: number,
    ) => {
      const el = columnRefs.current.get(workDate);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pointerMinute = minutesFromPointer(
        clientY,
        rect,
        rangeStartMinutes,
        rangeEndMinutes,
      );
      moveCommittedRef.current = false;
      const startMinutes = parseTimeToMinutes(shift.startTime);
      const endMinutes = parseTimeToMinutes(shift.endTime);
      setMoveDrag({
        shiftId: shift.id,
        fromWorkDate: workDate,
        workDate,
        durationMinutes: endMinutes - startMinutes,
        startMinutes,
        grabOffsetMinutes: pointerMinute - startMinutes,
      });
    },
    [rangeEndMinutes, rangeStartMinutes],
  );

  useEffect(() => {
    if (!createDrag && !resizeDrag && !moveDrag) return;

    function onMove(event: PointerEvent) {
      if (createDrag) {
        const el = columnRefs.current.get(createDrag.workDate);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const current = minutesFromPointer(
          event.clientY,
          rect,
          rangeStartMinutes,
          rangeEndMinutes,
        );
        setCreateDrag((prev) =>
          prev ? { ...prev, currentMinutes: current } : null,
        );
      }
      if (resizeDrag) {
        const el = columnRefs.current.get(resizeDrag.workDate);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const current = minutesFromPointer(
          event.clientY,
          rect,
          rangeStartMinutes,
          rangeEndMinutes,
        );
        const minEnd = resizeDrag.startMinutes + TIME_SNAP_MINUTES;
        setResizeDrag((prev) =>
          prev
            ? {
                ...prev,
                currentMinutes: Math.max(minEnd, current),
              }
            : null,
        );
      }
      if (moveDrag) {
        const targetDate =
          workDateAtPointerX(event.clientX, columnRefs.current) ??
          moveDrag.workDate;
        const el = columnRefs.current.get(targetDate);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pointerMinute = minutesFromPointer(
          event.clientY,
          rect,
          rangeStartMinutes,
          rangeEndMinutes,
        );
        const rawStart = pointerMinute - moveDrag.grabOffsetMinutes;
        const maxStart = rangeEndMinutes - moveDrag.durationMinutes;
        const newStart = snapMinutes(
          Math.max(rangeStartMinutes, Math.min(rawStart, maxStart)),
        );
        setMoveDrag((prev) =>
          prev
            ? {
                ...prev,
                workDate: targetDate,
                startMinutes: newStart,
              }
            : null,
        );
      }
    }

    function onUp() {
      if (createDrag) {
        const start = Math.min(
          createDrag.anchorMinutes,
          createDrag.currentMinutes,
        );
        const end = Math.max(
          createDrag.anchorMinutes,
          createDrag.currentMinutes,
        );
        if (end - start >= TIME_SNAP_MINUTES) {
          onCreateRange({
            workDate: createDrag.workDate,
            startTime: minutesToTimeValue(start),
            endTime: minutesToTimeValue(end),
          });
        }
        setCreateDrag(null);
      }
      if (resizeDrag) {
        const accepted = onResizeEnd({
          shiftId: resizeDrag.shiftId,
          endTime: minutesToTimeValue(resizeDrag.currentMinutes),
        });
        if (accepted === false) {
          resizeCommittedRef.current = false;
          setResizeDrag(null);
        } else {
          resizeCommittedRef.current = true;
        }
      }
      if (moveDrag) {
        const endMinutes = moveDrag.startMinutes + moveDrag.durationMinutes;
        const accepted = onMoveEnd({
          shiftId: moveDrag.shiftId,
          workDate: moveDrag.workDate,
          startTime: minutesToTimeValue(moveDrag.startMinutes),
          endTime: minutesToTimeValue(endMinutes),
        });
        if (accepted === false) {
          moveCommittedRef.current = false;
          setMoveDrag(null);
        } else {
          moveCommittedRef.current = true;
        }
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    createDrag,
    moveDrag,
    onCreateRange,
    onMoveEnd,
    onResizeEnd,
    rangeEndMinutes,
    rangeStartMinutes,
    resizeDrag,
  ]);

  return {
    createDrag,
    resizeDrag,
    moveDrag,
    setColumnRef,
    beginCreate,
    beginResize,
    beginMove,
    resetDrag,
  };
}