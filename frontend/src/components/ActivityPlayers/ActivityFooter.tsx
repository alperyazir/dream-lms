/**
 * Activity Footer - Submit, Save, Exit buttons
 * Story 2.5 - Phase 1, Task 1.3
 */

import { Button } from "@/components/ui/button"

interface ActivityFooterProps {
  onExit: () => void
  onSave: () => void
  onSubmit: () => void
  isComplete: boolean
  isSaving?: boolean
}

export function ActivityFooter({
  onExit,
  onSave,
  onSubmit,
  isComplete,
  isSaving = false,
}: ActivityFooterProps) {
  return (
    <footer className="border-t bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left: Exit button */}
        <Button
          variant="outline"
          onClick={onExit}
          className="shadow-neuro-sm hover:shadow-neuro"
          aria-label="Exit activity and return to assignments"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Exit
        </Button>

        {/* Right: Save and Submit buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onSave}
            disabled={isSaving}
            className="shadow-neuro-sm hover:shadow-neuro"
            aria-label="Save progress"
          >
            {isSaving ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save Progress
              </>
            )}
          </Button>

          <Button
            onClick={onSubmit}
            disabled={!isComplete}
            className="bg-teal-600 shadow-neuro hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
            aria-label="Submit activity for grading"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Submit
          </Button>
        </div>
      </div>

      {/* Helper text for incomplete activities */}
      {!isComplete && (
        <div className="mx-auto mt-2 max-w-7xl">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Complete all required items to enable submission
          </p>
        </div>
      )}
    </footer>
  )
}
