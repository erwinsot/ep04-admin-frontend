type SkeletonTableRowsProps = {
  columns: number
  rows?: number
}

export function SkeletonTableRows({ columns, rows = 5 }: SkeletonTableRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={`skeleton-cell-${rowIndex}-${colIndex}`}>
              <span className={`skeleton-line skeleton-line-${(rowIndex + colIndex) % 3}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
