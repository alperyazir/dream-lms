# 6. Activity Player Architecture

## 6.1 Activity Rendering Engine

**Universal Player Component:**

```typescript
// features/activities/ActivityPlayer.tsx
export function ActivityPlayer({ assignmentId }: Props) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', assignmentId],
    queryFn: () => assignmentService.start(assignmentId),
  });

  const [answers, setAnswers] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (answers) {
        assignmentService.saveProgress(assignmentId, answers);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [answers, assignmentId]);

  const handleSubmit = async () => {
    const score = calculateScore(answers, activity);
    await assignmentService.submit(assignmentId, { answers, score });
    setShowResults(true);
  };

  // Render appropriate player based on activity type
  const renderPlayer = () => {
    switch (activity.type) {
      case 'dragdroppicture':
        return <DragDropPicturePlayer activity={activity} onAnswersChange={setAnswers} />;
      case 'matchTheWords':
        return <MatchTheWordsPlayer activity={activity} onAnswersChange={setAnswers} />;
      // ... other types
    }
  };

  return (
    <div className="activity-player">
      <ActivityHeader activity={activity} timeLimit={activity.time_limit_minutes} />
      {renderPlayer()}
      <ActivityFooter onSubmit={handleSubmit} submitDisabled={!isComplete(answers)} />
      {showResults && <ActivityResults score={score} answers={answers} />}
    </div>
  );
}
```

## 6.2 Scoring Algorithms

**Client-Side Scoring (for immediate feedback):**

```typescript
// lib/scoring.ts
export function calculateScore(answers: any, activity: Activity): number {
  switch (activity.type) {
    case 'dragdroppicture':
      return scoreDragDrop(answers, activity.answer);
    case 'matchTheWords':
      return scoreMatch(answers, activity.sentences);
    case 'circle':
      return scoreCircle(answers, activity.answer);
    case 'puzzleFindWords':
      return scoreWordSearch(answers, activity.words);
  }
}

function scoreDragDrop(userAnswers: Map<string, string>, correctAnswers: DragDropAnswer[]): number {
  let correct = 0;
  correctAnswers.forEach(answer => {
    const dropZoneId = `${answer.coords.x}-${answer.coords.y}`;
    if (userAnswers.get(dropZoneId) === answer.text) {
      correct++;
    }
  });
  return Math.round((correct / correctAnswers.length) * 100);
}
```

---
