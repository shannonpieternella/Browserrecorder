import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

const VideoRecorder = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  let recordedChunks = [];

  const handleStartCaptureClick = () => {
    setCapturing(true);
    recordedChunks = [];
    const stream = webcamRef.current.video.srcObject;

    let options = { mimeType: 'video/webm; codecs=vp9' };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4; codecs=avc1.42E01E,mp4a.40.2' }; // H.264 video codec, AAC audio codec
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error("This browser doesn't support video recording in WebM or MP4 format.");
        return;
      }
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch (e) {
      console.error('Error creating MediaRecorder:', e);
      return;
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const recordedBlob = new Blob(recordedChunks, { type: options.mimeType });

      if (recordedBlob.size > 0) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/generate-signed-url`);
          if (!response.ok) throw new Error('Failed to fetch signed URL.');

          const { url: signedUploadUrl } = await response.json();

          const uploadResponse = await fetch(signedUploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': options.mimeType,
            },
            body: recordedBlob,
          });

          if (!uploadResponse.ok) throw new Error('Upload failed');

          setVideoUrl(signedUploadUrl); // Set the video URL for playback
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
    if (videoUrl) {
      videoRef.current.src = videoUrl;
    }
  }, [videoUrl]);

  return (
    <div>
      <Webcam audio={true} ref={webcamRef} />
      <button onClick={capturing ? handleStopCaptureClick : handleStartCaptureClick}>
        {capturing ? 'Stop Recording' : 'Start Recording'}
      </button>
      {videoUrl && (
        <div>
          <h2>Recorded Video</h2>
          <video ref={videoRef} controls width="400" height="300">
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
