const models = "/assets/js/lib/face-api/models";

const videoStream = (element, hasDetectFaces = true) => {
  const videoElement = document.querySelector(element);
  navigator.getUserMedia(
    { video: {} },
    (stream) => (videoElement.srcObject = stream),
    (err) => console.error(err)
  );
  hasDetectFaces && detectFaces(videoElement);
};

async function detectFaces(media, options = {}) {
  const defaultOptions = {
      intervalTimeout: 500,
      networks: [
        "faceDetector",
        "faceLandmark",
        "faceRecognition",
        "faceExpression",
      ],
      mode: "multipleFace",
      ...options,
    },
    type = media.tagName.toLowerCase();
  let detections = {};

  await loadModels();

  type === "video"
    ? media.addEventListener("play", async () => {
        await draw(media, defaultOptions, true).then(
          (result) => (detections = result)
        );
      })
    : await draw(media, defaultOptions).then((result) => (detections = result));
  return detections;
}

async function draw(
  media,
  { intervalTimeout, mode, networks },
  realtime = false
) {
  let canvas = faceapi.createCanvasFromMedia(media),
    displaySize = {
      width: media.width,
      height: media.height,
    },
    result = {};
  clearRect();
  faceapi.matchDimensions(canvas, displaySize);
  canvas.id = `face-${~~(Math.random() * 1000)}`;
  canvas.classList.add("center");
  media.after(canvas);
  if (realtime) {
    setInterval(async () => {
      await render();
    }, intervalTimeout);
  } else await render().then((detection) => (result = detection));

  async function render() {
    try {
      let detections =
        mode === "singleFace"
          ? await faceapi
              .detectSingleFace(media, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceExpressions()
          : await faceapi
              .detectAllFaces(media, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      clearRect();
      hasFaceDetector(networks) &&
        faceapi.draw.drawDetections(canvas, resizedDetections);
      hasFaceLandmarks(networks) &&
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      hasFaceExpression(networks) &&
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      return detections;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function clearRect() {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  return result;
}

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri(models);
  await faceapi.nets.faceLandmark68Net.loadFromUri(models);
  await faceapi.nets.faceRecognitionNet.loadFromUri(models);
  await faceapi.nets.faceExpressionNet.loadFromUri(models);
}

function hasFaceDetector(networks) {
  return networks.includes("faceDetector");
}

function hasFaceLandmarks(networks) {
  return networks.includes("faceLandmark");
}

function hasFaceRecognition(networks) {
  return networks.includes("faceRecognition");
}

function hasFaceExpression(networks) {
  return networks.includes("faceExpression");
}
