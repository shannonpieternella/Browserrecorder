import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';


const VideoRecorder = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  let recordedChunks = [];

  console.log(process.env.REACT_APP_API_URL);

  const handleStartCaptureClick = () => {
    setCapturing(true);
    recordedChunks = []; // Reset the recordedChunks before starting a new recording.

    const stream = webcamRef.current.stream;
    let options = { mimeType: 'video/webm; codecs=vp9' }; // Preferred format for most browsers, including Firefox.
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4; codecs=mp4a.40.2' }; // Fallback for Safari
      // Note: Safari's support for video/mp4 in MediaRecorder is limited and may not work as expected.
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error("This browser doesn't support video recording in WebM or MP4 format.");
        return; // early exit if neither format is supported
      }
    }

    // Attempt to create a MediaRecorder with the determined options.
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch (e) {
      console.error('Error creating MediaRecorder:', e);
      return; // early exit if MediaRecorder throws an error
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const recordedBlob = new Blob(recordedChunks, { type: options.mimeType });
      console.log(`Recorded Blob size: ${recordedBlob.size} bytes`);
      console.log(`Using MIME type: ${options.mimeType}`);

      if (recordedBlob.size > 0) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/generate-signed-url`);
          if (!response.ok) throw new Error('Failed to fetch signed URL.');

          const { url: signedUploadUrl } = await response.json();

          const uploadResponse = await fetch(signedUploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'video/webm', // This must match the MIME type given at signed URL creation
            },
            body: recordedBlob,
          });

          if (!uploadResponse.ok) throw new Error('Upload failed');
          console.log('Upload successful');
        } catch (error) {
          console.error('Upload error:', error.message);
        }
      } else {
        console.warn('Recorded blob is empty. No data to upload.');
      }
    };

    mediaRecorderRef.current.onerror = (event) => console.log("MediaRecorder Error:", event.error);

    mediaRecorderRef.current.start();
    console.log(`Recording started with MIME type: ${options.mimeType}`);
  };

  const handleStopCaptureClick = () => {
    mediaRecorderRef.current.stop();
    setCapturing(false);
    console.log('Recording stopped. Processing data...');
  };

  useEffect(() => {
    // Cleanup function to handle the component unmount if recording is in progress
    return () => {
      if (capturing && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [capturing]);

  return (
    <div>
      <Webcam audio={true} ref={webcamRef} />
      <button onClick={capturing ? handleStopCaptureClick : handleStartCaptureClick}>
        {capturing ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
};

export default VideoRecorder;
