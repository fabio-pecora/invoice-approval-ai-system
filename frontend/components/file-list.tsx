export function FileList({ files }: { files: File[] }) {
  if (files.length === 0) {
    return <p className="helper-text">No files selected.</p>;
  }

  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
      ))}
    </ul>
  );
}
