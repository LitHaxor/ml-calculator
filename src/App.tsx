import React, { useRef, useState, useEffect } from "react";
import "./App.css";

type Label = {
  name: string;
  color: string;
};

type Point = {
  x: number;
  y: number;
  label: string; // User-selected label
  actualLabel?: string; // Used to store the actual label for evaluation
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>(""); // Store the selected label
  const [activeTab, setActiveTab] = useState<string>("classification"); // Tab state

  const colors = [
    "#f56565",
    "#48bb78",
    "#4299e1",
    "#ed64a6",
    "#ecc94b",
    "#9f7aea",
  ];

  const drawSections = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sectionWidth = canvas.width / labels.length;

        labels.forEach((label, index) => {
          ctx.fillStyle = `${label.color}80`; // Apply transparency
          ctx.fillRect(index * sectionWidth, 0, sectionWidth, canvas.height);
          ctx.fillStyle = "black";
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.fillText(label.name, (index + 0.5) * sectionWidth, 30);
        });
      }
    }
  };

  const drawPoints = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
          ctx.fillStyle =
            labels.find((label) => label.name === point.label)?.color ||
            "black";
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fill();
          ctx.textAlign = "center";
          ctx.fillStyle = "white";
          ctx.font = "12px Arial";
          ctx.fillText(point.label, point.x, point.y + 4);
        });
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resizeCanvas = () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        drawSections();
        drawPoints(); // Redraw points when the labels or points state changes
      };

      resizeCanvas(); // Initial resize
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }
  }, [labels, points]);

  const handleLabelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (labels.length >= colors.length) {
      alert("Maximum number of labels reached!");
      return;
    }
    const newLabel: Label = {
      name: currentLabel,
      color: colors[labels.length], // Assign a unique color for each label
    };
    setLabels([...labels, newLabel]);
    setCurrentLabel("");
  };

  const reset = () => {
    if (window.confirm("Are you sure you want to reset?")) {
      setLabels([]);
      setPoints([]);
      setSelectedLabel("");
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && selectedLabel) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Determine the actual label based on the section of the canvas clicked
      const sectionWidth = canvas.width / labels.length;
      const clickedSectionIndex = Math.floor(x / sectionWidth);
      const actualLabel = labels[clickedSectionIndex]?.name || "";

      const newPoint: Point = {
        x,
        y,
        label: selectedLabel, // User-selected label
        actualLabel, // Assign the calculated actual label
      };

      setPoints([...points, newPoint]);
    } else {
      alert("Please select a label before placing it on the canvas.");
    }
  };

  const calculateConfusionMatrixAndMetrics = () => {
    const matrix: { [key: string]: { [key: string]: number } } = {};
    const metrics: {
      [key: string]: { TP: number; FP: number; FN: number; TN: number };
    } = {};

    // Initialize confusion matrix and metrics structure
    labels.forEach((label) => {
      matrix[label.name] = {};
      labels.forEach((otherLabel) => {
        matrix[label.name][otherLabel.name] = 0; // Initialize counts
      });

      metrics[label.name] = { TP: 0, FP: 0, FN: 0, TN: 0 };
    });

    // Fill confusion matrix and calculate TP, FP, FN, TN for each label
    points.forEach((point) => {
      if (point.actualLabel && matrix[point.actualLabel]) {
        matrix[point.actualLabel][point.label]++;
      }
    });

    // Calculate TP, FP, FN, TN for each label
    labels.forEach((label) => {
      const labelName = label.name;
      let TP = 0,
        FP = 0,
        FN = 0,
        TN = 0;

      points.forEach((point) => {
        if (point.label === labelName && point.actualLabel === labelName) {
          TP++; // True Positive
        } else if (
          point.label === labelName &&
          point.actualLabel !== labelName
        ) {
          FP++; // False Positive
        } else if (
          point.label !== labelName &&
          point.actualLabel === labelName
        ) {
          FN++; // False Negative
        } else {
          TN++; // True Negative
        }
      });

      metrics[labelName] = { TP, FP, FN, TN };
    });

    return { matrix, metrics };
  };

  const calculateMetrics = (metrics: {
    [key: string]: { TP: number; FP: number; FN: number; TN: number };
  }) => {
    const metricsByLabel: {
      [key: string]: {
        precision: string;
        recall: string;
        accuracy: string;
        f1Score: string;
      };
    } = {};

    labels.forEach((label) => {
      const { TP, FP, FN, TN } = metrics[label.name];

      const precision = TP / (TP + FP || 1);
      const recall = TP / (TP + FN || 1);
      const accuracy = (TP + TN) / (TP + FP + FN + TN || 1);
      const f1Score = (2 * precision * recall) / (precision + recall || 1);

      metricsByLabel[label.name] = {
        precision: precision.toFixed(2) || "0",
        recall: recall.toFixed(2) || "0",
        accuracy: accuracy.toFixed(2) || "0",
        f1Score: f1Score.toFixed(2) || "0",
      };
    });

    const averageMetrics = {
      accuracy: (
        Object.values(metricsByLabel).reduce(
          (acc, curr) => acc + parseFloat(curr.accuracy),
          0
        ) / labels.length || 0
      ).toFixed(2),
      precision: (
        Object.values(metricsByLabel).reduce(
          (acc, curr) => acc + parseFloat(curr.precision),
          0
        ) / labels.length || 0
      ).toFixed(2),
      recall: (
        Object.values(metricsByLabel).reduce(
          (acc, curr) => acc + parseFloat(curr.recall),
          0
        ) / labels.length || 0
      ).toFixed(2),
      f1Score: (
        Object.values(metricsByLabel).reduce(
          (acc, curr) => acc + parseFloat(curr.f1Score),
          0
        ) / labels.length || 0
      ).toFixed(2),
    };

    return { metricsByLabel, averageMetrics };
  };

  const { matrix: confusionMatrix, metrics } =
    calculateConfusionMatrixAndMetrics();
  const { metricsByLabel, averageMetrics } = calculateMetrics(metrics);

  // Now you can use metricsByLabel to render your metrics and accuracy correctly.

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-around p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-400 w-full h-96" // Responsive sizing
          onClick={handleCanvasClick}
        />
        <div className="flex w-full bg-black text-white p-4 rounded-md flex-col items-center justify-center mt-4">
          <p>
            Contributer{" "}
            <a
              href="https://www.github.com/lithaxor"
              className="text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              LitHaxor ❤️
            </a>{" "}
            <a
              href="https://github.com/LitHaxor/ml-calculator.git"
              className="text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              Github
            </a>
          </p>
        </div>
      </div>
      <div className="w-full md:w-1/3 p-4 bg-white overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Label Tools</h2>
        <form onSubmit={handleLabelSubmit} className="flex flex-col mb-4">
          <label className="text-lg font-bold mb-2">Add Label</label>
          <input
            type="text"
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            placeholder="Please enter a label name"
            className="border rounded-md p-2 mb-4"
            required
          />
          <div className="flex flex-row w-full justify-around items-center">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Add Label
            </button>
            <button
              type="button"
              onClick={reset}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Reset
            </button>
          </div>
        </form>

        <hr className="my-4" />

        <p
          className={`text-lg font-bold mb-2 ${
            selectedLabel ? "text-green-500" : "text-red-500"
          }`}
        >
          Select labels
        </p>

        <div className="flex flex-wrap gap-4 mb-4">
          {labels.map((label) => (
            <button
              key={label.name}
              onClick={() => setSelectedLabel(label.name)}
              className="px-4 py-2 rounded-md text-white"
              style={{
                backgroundColor:
                  selectedLabel === label.name ? label.color : "grey",
              }}
            >
              {label.name}
            </button>
          ))}
        </div>

        <hr className="my-4" />

        <div className="mb-4 flex justify-around w-full">
          <button
            onClick={() => setActiveTab("classification")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "classification"
                ? "bg-blue-500 text-white"
                : "bg-gray-300"
            }`}
          >
            Classification Metrics
          </button>
          <button
            onClick={() => setActiveTab("confusion")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "confusion"
                ? "bg-blue-500 text-white"
                : "bg-gray-300"
            }`}
          >
            Confusion Matrix
          </button>
        </div>

        <hr className="my-4" />

        {activeTab === "classification" && (
          <div>
            <h3 className="text-xl font-bold mb-2">Metrics</h3>
            <table className="table-auto border-collapse border border-gray-400 w-full">
              <thead>
                <tr>
                  <th className="border px-4 py-2">Label</th>
                  <th className="border px-4 py-2">Accuracy</th>
                  <th className="border px-4 py-2">Precision</th>
                  <th className="border px-4 py-2">Recall</th>
                  <th className="border px-4 py-2">F1 Score</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(metricsByLabel).map((label) => (
                  <tr key={label}>
                    <td className="border px-4 py-2">{label}</td>
                    <td className="border px-4 py-2">
                      {(metricsByLabel[label] as { accuracy: string }).accuracy}
                    </td>
                    <td className="border px-4 py-2">
                      {
                        (metricsByLabel[label] as { precision: string })
                          .precision
                      }
                    </td>
                    <td className="border px-4 py-2">
                      {(metricsByLabel[label] as { recall: string }).recall}
                    </td>
                    <td className="border px-4 py-2">
                      {(metricsByLabel[label] as { f1Score: string }).f1Score}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="border px-4 py-2 font-bold">Average</td>
                  <td className="border px-4 py-2">
                    {averageMetrics.accuracy}
                  </td>
                  <td className="border px-4 py-2">
                    {averageMetrics.precision}
                  </td>
                  <td className="border px-4 py-2">{averageMetrics.recall}</td>
                  <td className="border px-4 py-2">{averageMetrics.f1Score}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {activeTab === "confusion" && (
          <div className="text-lg">
            <h3 className="font-bold mb-2">Confusion Matrix</h3>
            {
              <table className="table-auto border-collapse border border-gray-400 w-full">
                <thead>
                  <tr>
                    <th className="border px-4 py-2"></th>
                    {labels.map((label) => (
                      <th key={label.name} className="border px-4 py-2">
                        {label.name} (A)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(confusionMatrix).map((actualLabel) => (
                    <tr key={actualLabel}>
                      <td className="border px-4 py-2">{actualLabel} (P)</td>
                      {labels.map((label) => (
                        <td
                          key={label.name}
                          className="border px-4 py-2"
                          style={{
                            backgroundColor:
                              actualLabel === label.name ? "gray" : "white",
                          }}
                        >
                          {confusionMatrix[actualLabel][label.name]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="border px-4 py-2 font-bold">Total</td>
                    {labels.map((label) => (
                      <td key={label.name} className="border px-4 py-2">
                        {
                          points.filter(
                            (point) => point.actualLabel === label.name
                          ).length
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-bold">Predicted</td>
                    {labels.map((label) => (
                      <td key={label.name} className="border px-4 py-2">
                        {
                          points.filter((point) => point.label === label.name)
                            .length
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-bold">Total</td>
                    <td className="border px-4 py-2" colSpan={labels.length}>
                      {points.length}
                    </td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-bold">TP</td>
                    {labels.map((label) => (
                      <td key={label.name} className="border px-4 py-2">
                        {
                          points.filter(
                            (point) =>
                              point.actualLabel === label.name &&
                              point.label === label.name
                          ).length
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-bold">FP</td>
                    {labels.map((label) => (
                      <td key={label.name} className="border px-4 py-2">
                        {
                          points.filter(
                            (point) =>
                              point.actualLabel !== label.name &&
                              point.label === label.name
                          ).length
                        }
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-bold">FN</td>
                    {labels.map((label) => (
                      <td key={label.name} className="border px-4 py-2">
                        {
                          points.filter(
                            (point) =>
                              point.actualLabel === label.name &&
                              point.label !== label.name
                          ).length
                        }
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="border px-4 py-2 font-bold">TN</td>
                    {labels.map((label) => (
                      <td key={label.name} className="border px-4 py-2">
                        {
                          points.filter(
                            (point) =>
                              point.actualLabel !== label.name &&
                              point.label !== label.name
                          ).length
                        }
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="border px-4 py-2 font-bold">Accuracy</td>
                    {labels.map((label) => (
                      <td>{metricsByLabel[label.name].accuracy}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
