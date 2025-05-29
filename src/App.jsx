import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [compressionStats, setCompressionStats] = useState(null);
  const [fileDetails, setFileDetails] = useState([]);
  const [zipProgress, setZipProgress] = useState(null);
  const [zipBlob, setZipBlob] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipReady, setZipReady] = useState(false);

  const handleFileInput = (e) => {
    setFiles(Array.from(e.target.files));
    resetState();
  };

  const handleFolderInput = (e) => {
    setFiles(Array.from(e.target.files));
    resetState();
  };

  const resetState = () => {
    setCompressionStats(null);
    setFileDetails([]);
    setZipProgress(null);
    setZipBlob(null);
    setIsZipping(false);
    setZipReady(false);
  };

  const handleZip = async () => {
    if (files.length === 0) return alert("No files selected");
    setIsZipping(true);
    setZipProgress({ percent: 0, elapsed: 0, remaining: 0, currentFile: '' });
    const zip = new JSZip();
    let totalOriginalSize = 0;
    const details = [];

    for (const file of files) {
      totalOriginalSize += file.size;
      const content = await file.arrayBuffer();
      const singleZip = new JSZip();
      singleZip.file(file.name, content, { compression: "DEFLATE" });
      const zipped = await singleZip.generateAsync({ type: 'blob' });
      details.push({
        name: file.name,
        originalSize: file.size,
        compressedSize: zipped.size,
        ratio: ((1 - zipped.size / file.size) * 100).toFixed(2),
      });
      zip.file(file.webkitRelativePath || file.name, file, { compression: "DEFLATE" });
    }

    const startTime = Date.now();
    const fullZip = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE' },
      (metadata) => {
        const percent = metadata.percent.toFixed(2);
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedTotalTime = elapsed / (metadata.percent / 100);
        const remaining = Math.max(0, estimatedTotalTime - elapsed);
        setZipProgress({
          percent,
          elapsed: elapsed.toFixed(1),
          remaining: remaining.toFixed(1),
          currentFile: metadata.currentFile,
        });
      }
    );

    setZipProgress(null);
    setIsZipping(false);
    setZipReady(true);
    setZipBlob(fullZip);
    setCompressionStats({
      originalSize: totalOriginalSize,
      compressedSize: fullZip.size,
      ratio: ((1 - fullZip.size / totalOriginalSize) * 100).toFixed(2)
    });
    setFileDetails(details);
  };

  const handleDownload = () => {
    if (zipBlob) {
      const firstPath = files[0]?.webkitRelativePath || files[0]?.name || 'archive';
      const zipName = firstPath.split('/')[0] || firstPath.split('.')[0];
      saveAs(zipBlob, `${zipName}.zip`);
    }
  };

  const handleDownloadTXT = () => {
    if (!compressionStats || fileDetails.length === 0) return;

    let txtContent = `Compression Summary\n`;
    txtContent += `-------------------------\n`;
    txtContent += `Original Size: ${(compressionStats.originalSize / 1024 / 1024).toFixed(2)} MB\n`;
    txtContent += `Compressed Size: ${(compressionStats.compressedSize / 1024 / 1024).toFixed(2)} MB\n`;
    txtContent += `Compression Ratio: ${compressionStats.ratio}%\n\n`;

    txtContent += `File Compression Details:\n`;
    txtContent += `-------------------------\n`;

    fileDetails.forEach(file => {
      txtContent += `File: ${file.name}\n`;
      txtContent += `Original Size: ${(file.originalSize / 1024).toFixed(2)} KB\n`;
      txtContent += `Compressed Size: ${(file.compressedSize / 1024).toFixed(2)} KB\n`;
      txtContent += `Ratio: ${file.ratio < 0 ? `+${Math.abs(file.ratio)}% larger` : `${file.ratio}% smaller`}\n`;
      txtContent += `-------------------------\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'compression-details.txt');
  };

  return (
    <div className="app-wrapper">
      <div className="card">
        <h1 className="title">📁 Zip Files App</h1>
        <div className="file-container">
          <label className="file-label">
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="file-input"
            />
            📄 Choose Files
          </label>
          <label className="file-label">
            <input
              type="file"
              multiple
              webkitdirectory="true"
              directory=""
              onChange={handleFolderInput}
              className="file-input"
            />
            📂 Choose Folder
          </label>
        </div>
        <button
          className="zip-button"
          onClick={zipReady ? handleDownload : handleZip}
          disabled={isZipping}
        >
          {isZipping ? "Zipping..." : zipReady ? "Download ZIP" : "🔽 Zip Files"}
        </button>
        {zipProgress && (
          <div className="progress-bar-wrapper">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${zipProgress.percent}%` }}
              />
              <div className="progress-text">{zipProgress.percent}%</div>
            </div>
            <p>Elapsed: {zipProgress.elapsed}s</p>
            <p>Estimated time left: {zipProgress.remaining}s</p>
            <p>Current file: {zipProgress.currentFile || "N/A"}</p>
          </div>
        )}
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div className="file-item" key={index}>
                📄 {file.name}
              </div>
            ))}
          </div>
        )}
        {compressionStats && (
          <div className="compression-stats">
            <p>🧩 <strong>Original Size:</strong> {(compressionStats.originalSize / 1024 / 1024).toFixed(2)} MB</p>
            <p>🗜️ <strong>Compressed Size:</strong> {(compressionStats.compressedSize / 1024 / 1024).toFixed(2)} MB</p>
            <p>📉 <strong>Compression Ratio:</strong> {compressionStats.ratio}%</p>
          </div>
        )}
      </div>
      {fileDetails.length > 0 && (
        <div className="side-panel">
          <h2>📄 File Compression Details</h2>
          <button className="zip-button" onClick={handleDownloadTXT}>
            📄 Download Details as TXT
          </button>
          <div className="scrollable-panel">
            {fileDetails.map((file, index) => (
              <div className="detail-item" key={index}>
                <strong>{file.name}</strong>
                <p>Original: {(file.originalSize / 1024).toFixed(2)} KB</p>
                <p>Compressed: {(file.compressedSize / 1024).toFixed(2)} KB</p>
                <p>
                  Ratio: {file.ratio < 0
                    ? `+${Math.abs(file.ratio)}% larger`
                    : `${file.ratio}% smaller`}
                </p>
              </div>
            ))}
          </div>
          
        </div>
      )}
    </div>
  );
}

export default App;
