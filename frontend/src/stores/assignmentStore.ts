import { create } from "zustand"
import { mockAssignments, type AssignmentFull } from "@/lib/mockData"

interface AssignmentStore {
  assignments: AssignmentFull[]
  addAssignment: (assignment: AssignmentFull) => void
  updateAssignment: (id: string, updates: Partial<AssignmentFull>) => void
  deleteAssignment: (id: string) => void
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignments: mockAssignments,

  addAssignment: (assignment) =>
    set((state) => ({
      assignments: [...state.assignments, assignment],
    })),

  updateAssignment: (id, updates) =>
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  deleteAssignment: (id) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
    })),
}))
