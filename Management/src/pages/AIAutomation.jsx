import { useState } from "react";
import toast from "react-hot-toast";
import { aiAPI } from "../services/api";

const Card = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input
      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
);

const AIAutomation = () => {
  const [loading, setLoading] = useState(false);
  const [recommendPayload, setRecommendPayload] = useState({
    leadId: "",
    budget: "",
    destination: "",
    numberOfTravelers: "",
    travelPurpose: "",
    limit: "5",
  });
  const [recommendations, setRecommendations] = useState([]);

  const [comparePackageIds, setComparePackageIds] = useState("");
  const [comparison, setComparison] = useState([]);

  const [documentPayload, setDocumentPayload] = useState({
    leadId: "",
    autoSend: false,
    types: {
      quotation: true,
      invoice: true,
      receipt: false,
      voucher: true,
    },
  });
  const [generatedDocs, setGeneratedDocs] = useState(null);

  const [agentStatus, setAgentStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);

  const [overridePayload, setOverridePayload] = useState({
    agentName: "customer-messaging-agent",
    action: "pause-agent",
    note: "",
    eventId: "",
  });

  const [manualEventPayload, setManualEventPayload] = useState({
    type: "lead.created",
    payload: '{"leadId": ""}',
  });

  const [feedbackPayload, setFeedbackPayload] = useState({
    leadId: "",
    outcome: "responded",
  });

  const runAsync = async (fn, successMessage) => {
    setLoading(true);
    try {
      const result = await fn();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      toast.error(error.message || "Action failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async () => {
    const response = await runAsync(
      () => aiAPI.recommendPackages({
        ...recommendPayload,
        budget: recommendPayload.budget ? Number(recommendPayload.budget) : undefined,
        numberOfTravelers: recommendPayload.numberOfTravelers
          ? Number(recommendPayload.numberOfTravelers)
          : undefined,
        limit: Number(recommendPayload.limit || 5),
      }),
      "Recommendations loaded",
    );
    if (response?.data) setRecommendations(response.data);
  };

  const handleCompare = async () => {
    const packageIds = comparePackageIds
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const response = await runAsync(
      () => aiAPI.comparePackages({
        packageIds,
        context: {
          destination: recommendPayload.destination,
          budget: recommendPayload.budget ? Number(recommendPayload.budget) : undefined,
          numberOfTravelers: recommendPayload.numberOfTravelers
            ? Number(recommendPayload.numberOfTravelers)
            : undefined,
          travelPurpose: recommendPayload.travelPurpose,
        },
      }),
      "Comparison generated",
    );
    if (response?.data) setComparison(response.data);
  };

  const handleGenerateDocs = async () => {
    const selectedTypes = Object.entries(documentPayload.types)
      .filter(([, checked]) => checked)
      .map(([key]) => key);
    const response = await runAsync(
      () => aiAPI.generateDocuments({
        leadId: documentPayload.leadId,
        types: selectedTypes,
        autoSend: documentPayload.autoSend,
      }),
      "Documents generated",
    );
    if (response?.data) setGeneratedDocs(response.data);
  };

  const loadOpsData = async () => {
    const [statusRes, logsRes, eventsRes] = await Promise.all([
      runAsync(() => aiAPI.getAgentStatus()),
      runAsync(() => aiAPI.getLogs({ limit: 20 })),
      runAsync(() => aiAPI.getEvents({ limit: 20 })),
    ]);
    if (statusRes?.data) setAgentStatus(statusRes.data);
    if (logsRes?.data) setLogs(logsRes.data);
    if (eventsRes?.data) setEvents(eventsRes.data);
  };

  const handleOverride = async () => {
    await runAsync(() => aiAPI.overrideAgent(overridePayload), "Override applied");
    await loadOpsData();
  };

  const handlePublishEvent = async () => {
    let payloadObject = {};
    try {
      payloadObject = manualEventPayload.payload ? JSON.parse(manualEventPayload.payload) : {};
    } catch (error) {
      toast.error("Payload must be valid JSON");
      return;
    }
    await runAsync(
      () => aiAPI.publishEvent({ type: manualEventPayload.type, payload: payloadObject }),
      "Event published",
    );
    await loadOpsData();
  };

  const handleFeedback = async () => {
    await runAsync(() => aiAPI.submitFollowUpFeedback(feedbackPayload), "Feedback submitted");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">AI Operations</h1>
          <p className="text-slate-600 text-sm md:text-base">
            Operate recommendations, document automation, events, and agent controls.
          </p>
        </div>
        <button
          onClick={loadOpsData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
        >
          Refresh Operations
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Recommend Packages">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Lead ID"
              value={recommendPayload.leadId}
              onChange={(e) => setRecommendPayload((p) => ({ ...p, leadId: e.target.value }))}
              placeholder="65f..."
            />
            <Input
              label="Budget"
              value={recommendPayload.budget}
              onChange={(e) => setRecommendPayload((p) => ({ ...p, budget: e.target.value }))}
              placeholder="2500"
            />
            <Input
              label="Destination"
              value={recommendPayload.destination}
              onChange={(e) => setRecommendPayload((p) => ({ ...p, destination: e.target.value }))}
              placeholder="Maldives"
            />
            <Input
              label="Travelers"
              value={recommendPayload.numberOfTravelers}
              onChange={(e) => setRecommendPayload((p) => ({ ...p, numberOfTravelers: e.target.value }))}
              placeholder="2"
            />
            <Input
              label="Travel Purpose"
              value={recommendPayload.travelPurpose}
              onChange={(e) => setRecommendPayload((p) => ({ ...p, travelPurpose: e.target.value }))}
              placeholder="honeymoon"
            />
            <Input
              label="Limit"
              value={recommendPayload.limit}
              onChange={(e) => setRecommendPayload((p) => ({ ...p, limit: e.target.value }))}
              placeholder="5"
            />
          </div>
          <button
            onClick={handleRecommend}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Run Recommendation
          </button>

          <div className="mt-4 space-y-2 max-h-64 overflow-auto">
            {recommendations.map((row) => (
              <div key={row.package?._id} className="rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-800">{row.package?.name}</div>
                <div className="text-sm text-slate-600">
                  Score: {row.score} | Destination: {row.package?.destination} | Price: {row.package?.price}
                </div>
                <div className="text-xs text-slate-500 mt-1">{(row.explainability || []).join(" | ")}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Compare Packages">
          <Input
            label="Package IDs (comma separated)"
            value={comparePackageIds}
            onChange={(e) => setComparePackageIds(e.target.value)}
            placeholder="id1,id2,id3"
          />
          <button
            onClick={handleCompare}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Compare
          </button>
          <div className="mt-4 space-y-2 max-h-64 overflow-auto">
            {comparison.map((row) => (
              <div key={row.packageId} className="rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-800">{row.name}</div>
                <div className="text-sm text-slate-600">
                  Score: {row.score} | Price: {row.metrics?.price} | Rating: {row.metrics?.rating}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Generate Documents">
          <Input
            label="Lead ID"
            value={documentPayload.leadId}
            onChange={(e) => setDocumentPayload((p) => ({ ...p, leadId: e.target.value }))}
            placeholder="65f..."
          />
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            {Object.keys(documentPayload.types).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={documentPayload.types[key]}
                  onChange={(e) => setDocumentPayload((p) => ({
                    ...p,
                    types: { ...p.types, [key]: e.target.checked },
                  }))}
                />
                {key}
              </label>
            ))}
            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={documentPayload.autoSend}
                onChange={(e) => setDocumentPayload((p) => ({ ...p, autoSend: e.target.checked }))}
              />
              Auto Send
            </label>
          </div>
          <button
            onClick={handleGenerateDocs}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Generate
          </button>
          {generatedDocs && (
            <pre className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-auto max-h-64">
              {JSON.stringify(generatedDocs, null, 2)}
            </pre>
          )}
        </Card>

        <Card title="Follow-up Feedback">
          <Input
            label="Lead ID"
            value={feedbackPayload.leadId}
            onChange={(e) => setFeedbackPayload((p) => ({ ...p, leadId: e.target.value }))}
            placeholder="65f..."
          />
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={feedbackPayload.outcome}
              onChange={(e) => setFeedbackPayload((p) => ({ ...p, outcome: e.target.value }))}
            >
              <option value="responded">responded</option>
              <option value="converted">converted</option>
              <option value="no-response">no-response</option>
            </select>
          </div>
          <button
            onClick={handleFeedback}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Submit Feedback
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Agent Controls">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Agent Name"
              value={overridePayload.agentName}
              onChange={(e) => setOverridePayload((p) => ({ ...p, agentName: e.target.value }))}
              placeholder="customer-messaging-agent"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={overridePayload.action}
                onChange={(e) => setOverridePayload((p) => ({ ...p, action: e.target.value }))}
              >
                <option value="pause-agent">pause-agent</option>
                <option value="resume-agent">resume-agent</option>
                <option value="replay-event">replay-event</option>
              </select>
            </div>
            <Input
              label="Note"
              value={overridePayload.note}
              onChange={(e) => setOverridePayload((p) => ({ ...p, note: e.target.value }))}
              placeholder="Reason for override"
            />
            <Input
              label="Event ID (for replay)"
              value={overridePayload.eventId}
              onChange={(e) => setOverridePayload((p) => ({ ...p, eventId: e.target.value }))}
              placeholder="optional"
            />
          </div>
          <button
            onClick={handleOverride}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Apply Override
          </button>
          <pre className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-auto max-h-48">
            {JSON.stringify(agentStatus, null, 2)}
          </pre>
        </Card>

        <Card title="Publish Event">
          <Input
            label="Event Type"
            value={manualEventPayload.type}
            onChange={(e) => setManualEventPayload((p) => ({ ...p, type: e.target.value }))}
            placeholder="lead.created"
          />
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Payload (JSON)</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 h-28 font-mono text-sm"
              value={manualEventPayload.payload}
              onChange={(e) => setManualEventPayload((p) => ({ ...p, payload: e.target.value }))}
            />
          </div>
          <button
            onClick={handlePublishEvent}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
          >
            Publish
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Recent Agent Logs">
          <div className="space-y-2 max-h-80 overflow-auto">
            {logs.map((log) => (
              <div key={log._id} className="border border-slate-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-slate-800">{log.agentName}</div>
                <div className="text-slate-600">
                  {log.eventType} | {log.status} | {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent Event Queue">
          <div className="space-y-2 max-h-80 overflow-auto">
            {events.map((event) => (
              <div key={event._id} className="border border-slate-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-slate-800">{event.type}</div>
                <div className="text-slate-600">
                  {event.status} | attempts: {event.attempts} | {new Date(event.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIAutomation;
