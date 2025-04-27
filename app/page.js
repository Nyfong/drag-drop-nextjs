"use client";

import { useState, useEffect, useRef } from "react";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

const initialData = {
  todo: [
    {
      id: "t1",
      content: "Design homepage",
      subtasks: [
        { id: "s1", content: "Create wireframe", completed: false },
        { id: "s2", content: "Choose color scheme", completed: true },
      ],
    },
    {
      id: "t2",
      content: "Write documentation",
      subtasks: [
        { id: "s3", content: "Draft introduction", completed: false },
        { id: "s4", content: "Add examples", completed: false },
      ],
    },
  ],
  inProgress: [
    {
      id: "t3",
      content: "Implement API",
      subtasks: [
        { id: "s5", content: "Set up endpoints", completed: false },
        { id: "s6", content: "Test integration", completed: false },
      ],
    },
  ],
  underReview: [
    {
      id: "t4",
      content: "Test UI components",
      subtasks: [
        { id: "s7", content: "Check responsiveness", completed: true },
        { id: "s8", content: "Fix bugs", completed: false },
      ],
    },
  ],
  done: [
    {
      id: "t5",
      content: "Deploy app",
      subtasks: [
        { id: "s9", content: "Configure server", completed: true },
        { id: "s10", content: "Run final tests", completed: true },
      ],
    },
  ],
};

export default function Home() {
  const [stages, setStages] = useState(initialData);
  const elementsRef = useRef(new Map());

  useEffect(() => {
    const cleanupFns = [];

    const setupDragAndDrop = () => {
      Object.keys(stages).forEach((stageId) => {
        const stageEl = elementsRef.current.get(`stage-${stageId}`);
        if (!stageEl) return;

        // Ensure stage is always a drop target
        const stageDrop = dropTargetForElements({
          element: stageEl,
          getData: () => ({ stageId }),
          canDrop: ({ source }) => source.data.type === "task",
          onDragEnter: () => stageEl.classList.add("bg-blue-50"),
          onDragLeave: () => stageEl.classList.remove("bg-blue-50"),
          onDrop: ({ source, self }) => {
            stageEl.classList.remove("bg-blue-50");
            const { stageId: fromStageId, id: taskId } = source.data;
            const toStageId = self.data.stageId;

            if (fromStageId === toStageId) return;

            setStages((prev) => {
              const fromTasks = [...prev[fromStageId]];
              const toTasks = [...prev[toStageId]];

              const taskIndex = fromTasks.findIndex((t) => t.id === taskId);
              if (taskIndex === -1) return prev;

              const [task] = fromTasks.splice(taskIndex, 1);
              toTasks.push(task);

              return {
                ...prev,
                [fromStageId]: fromTasks,
                [toStageId]: toTasks,
              };
            });
          },
        });

        cleanupFns.push(stageDrop);
      });

      Object.entries(stages).forEach(([stageId, tasks]) => {
        tasks.forEach((task, taskIndex) => {
          const taskEl = elementsRef.current.get(`task-${task.id}`);
          if (!taskEl) return;

          const taskDrag = draggable({
            element: taskEl,
            getInitialData: () => ({
              type: "task",
              id: task.id,
              stageId,
              index: taskIndex,
            }),
            onDragStart: () => taskEl.classList.add("opacity-50"),
            onDrop: () => taskEl.classList.remove("opacity-50"),
          });

          cleanupFns.push(taskDrag);

          task.subtasks.forEach((subtask, subtaskIndex) => {
            const subtaskEl = elementsRef.current.get(`subtask-${subtask.id}`);
            if (!subtaskEl) return;

            const subtaskDrag = draggable({
              element: subtaskEl,
              getInitialData: () => ({
                type: "subtask",
                id: subtask.id,
                taskId: task.id,
                stageId,
                index: subtaskIndex,
              }),
              onDragStart: () => subtaskEl.classList.add("opacity-50"),
              onDrop: () => subtaskEl.classList.remove("opacity-50"),
            });

            const subtaskDrop = dropTargetForElements({
              element: subtaskEl,
              getData: () => ({
                type: "subtask",
                id: subtask.id,
                taskId: task.id,
                stageId,
                index: subtaskIndex,
              }),
              canDrop: ({ source }) =>
                source.data.type === "subtask" && source.data.id !== subtask.id,
              onDragEnter: () => subtaskEl.classList.add("bg-blue-100"),
              onDragLeave: () => subtaskEl.classList.remove("bg-blue-100"),
              onDrop: ({ source, self }) => {
                const {
                  stageId: fromStageId,
                  taskId: fromTaskId,
                  index: fromIndex,
                } = source.data;
                const {
                  stageId: toStageId,
                  taskId: toTaskId,
                  index: toIndex,
                } = self.data;

                setStages((prev) => {
                  const newStages = JSON.parse(JSON.stringify(prev));

                  const fromTask = newStages[fromStageId]?.find(
                    (t) => t.id === fromTaskId
                  );
                  const toTask = newStages[toStageId]?.find(
                    (t) => t.id === toTaskId
                  );

                  if (!fromTask || !toTask) return prev;

                  const fromSubtasks = [...fromTask.subtasks];
                  const toSubtasks =
                    fromTaskId === toTaskId
                      ? fromSubtasks
                      : [...toTask.subtasks];

                  if (
                    fromIndex < 0 ||
                    fromIndex >= fromSubtasks.length ||
                    toIndex < 0 ||
                    toIndex > toSubtasks.length
                  ) {
                    return prev;
                  }

                  const [movedSubtask] = fromSubtasks.splice(fromIndex, 1);
                  toSubtasks.splice(toIndex, 0, movedSubtask);

                  fromTask.subtasks = fromSubtasks;
                  toTask.subtasks = toSubtasks;

                  return newStages;
                });
              },
            });

            cleanupFns.push(subtaskDrag, subtaskDrop);
          });
        });
      });
    };

    setupDragAndDrop();

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [stages]);

  return (
    <div className="flex gap-4 p-4">
      {Object.entries(stages).map(([stageId, tasks]) => (
        <div
          key={stageId}
          ref={(el) => el && elementsRef.current.set(`stage-${stageId}`, el)}
          className="w-1/4 p-4 border rounded bg-gray-50 min-h-[300px]" // Ensure stage itself is a drop target
        >
          <h2 className="font-bold capitalize mb-4">{stageId}</h2>
          {tasks.length === 0 && (
            <div className="text-gray-400 italic">No tasks yet</div>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              ref={(el) => el && elementsRef.current.set(`task-${task.id}`, el)}
              className="bg-white p-3 mb-4 rounded shadow"
            >
              <div className="font-semibold mb-2">{task.content}</div>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    ref={(el) =>
                      el && elementsRef.current.set(`subtask-${subtask.id}`, el)
                    }
                    className={`p-2 rounded ${
                      subtask.completed ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    {subtask.content}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
