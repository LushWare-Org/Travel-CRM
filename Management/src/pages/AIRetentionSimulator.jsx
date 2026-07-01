import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { aiAPI } from "../services/api";

const PIPELINE_STAGES = [
  { id: "customer", label: "Customer" },
  { id: "churn_model", label: "Churn Model" },
  { id: "risk_detection", label: "Risk Detection" },
  { id: "retention_state", label: "Retention State" },
  { id: "followup_agent", label: "Follow-Up Agent" },
  { id: "messaging_agent", label: "Messaging Agent" },
];

const AIRetentionSimulator = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [retentionState, setRetentionState] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [finalState, setFinalState] = useState(null);
  const [activeStage, setActiveStage] = useState("customer");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  );

  const runAsync = async (fn, successMessage) => {
    setBusy(true);
    try {
      const result = await fn();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      toast.error(error.message || "Simulation step failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const loadCustomers = async () => {
    const res = await runAsync(() => aiAPI.getCustomersForSimulation());
    const list = res?.data?.users || [];
    setCustomers(list);
    if (!selectedCustomerId && list.length) {
      setSelectedCustomerId(list[0]._id);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const applySnapshot = (data) => {
    if (data?.prediction) setPrediction(data.prediction);
    if (data?.retentionState) setRetentionState(data.retentionState);
    if (data?.followUp) setFollowUp(data.followUp);
    if (data?.finalState) setFinalState(data.finalState);
    if (data?.activeStage) setActiveStage(data.activeStage);
  };

  const handlePredict = async () => {
    if (!selectedCustomerId) return toast.error("Select a customer first");
    const res = await runAsync(
      () => aiAPI.simulateChurn(selectedCustomerId),
      "Churn prediction completed",
    );
    if (res?.data) applySnapshot(res.data);
  };

  const handleDetectRisk = async () => {
    if (!selectedCustomerId) return toast.error("Select a customer first");
    const res = await runAsync(
      () => aiAPI.simulateRisk(selectedCustomerId),
      "Risk detection completed",
    );
    if (res?.data) applySnapshot(res.data);
  };

  const handleCreateFollowUp = async () => {
    if (!selectedCustomerId) return toast.error("Select a customer first");
    const res = await runAsync(
      () => aiAPI.simulateFollowUp(selectedCustomerId, { action: "create" }),
      "Follow-up created",
    );
    if (res?.data) applySnapshot(res.data);
  };

  const handleRunFollowUpAgent = async () => {
    if (!selectedCustomerId) return toast.error("Select a customer first");
    const res = await runAsync(
      () => aiAPI.simulateFollowUp(selectedCustomerId, { action: "run" }),
      "Follow-up agent executed",
    );
    if (res?.data) {
      applySnapshot(res.data);
      setDelivery(res.data.delivery || null);
      setActiveStage("messaging_agent");
    }
  };

  const handleCustomerResponse = async (event) => {
    if (!selectedCustomerId) return toast.error("Select a customer first");
    const res = await runAsync(
      () => aiAPI.simulateRecover(selectedCustomerId, { event }),
      "Customer response simulated",
    );
    if (res?.data) {
      applySnapshot(res.data);
      setFinalState(res.data.finalState || res.data?.result?.retentionStatus || null);
      setActiveStage("retention_state");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-slate-800">AI Retention Simulator</h2>
        <p className="text-sm text-slate-600 mt-1">
          Simulate the full churn to retention workflow for demos and testing.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Customer</label>
        <div className="flex flex-wrap gap-2">
          <select
            className="min-w-[280px] rounded-lg border border-slate-300 px-3 py-2"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            <option value="">Choose a customer</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.name || "Unnamed"} ({customer.email || "no-email"})
              </option>
            ))}
          </select>
          <button
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={loadCustomers}
            disabled={busy}
          >
            Refresh Customers
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          <button className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60" onClick={handlePredict} disabled={busy}>Predict Churn</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60" onClick={handleDetectRisk} disabled={busy}>Detect Risk</button>
          <button className="px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60" onClick={handleCreateFollowUp} disabled={busy}>Create Follow-Up</button>
          <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" onClick={handleRunFollowUpAgent} disabled={busy}>Run Follow-Up Agent</button>
          <button className="px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60" onClick={() => handleCustomerResponse("purchase")} disabled={busy}>Customer Purchases</button>
          <button className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60" onClick={() => handleCustomerResponse("ignore")} disabled={busy}>Customer Ignores</button>
          <button className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 md:col-span-2 xl:col-span-1" onClick={() => handleCustomerResponse("reply_positive")} disabled={busy}>Customer Replies</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Pipeline View</h3>
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE_STAGES.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${activeStage === stage.id ? "bg-sky-100 text-sky-700 border border-sky-300" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {stage.label}
              </span>
              {index < PIPELINE_STAGES.length - 1 && <span className="text-slate-400">↓</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Current Simulation Data</h3>
          <div className="text-sm text-slate-700 space-y-1">
            <div>Customer: {selectedCustomer?.name || "-"}</div>
            <div>P(churn): {typeof prediction?.churnProbability === "number" ? prediction.churnProbability.toFixed(3) : "-"}</div>
            <div>Risk Level: {prediction?.riskLevel || retentionState?.lastRiskLevel || "-"}</div>
            <div>Priority: {prediction?.riskLevel || "-"}</div>
            <div>Retention Status: {retentionState?.retentionStatus || "-"}</div>
            <div>Follow-Up Template: {followUp?.template || "-"}</div>
            <div>Follow-Up Status: {followUp?.status || "-"}</div>
            <div>Next Follow-Up At: {retentionState?.nextFollowUpAt ? new Date(retentionState.nextFollowUpAt).toLocaleString() : "-"}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Delivery + Final Outcome</h3>
          <div className="text-sm text-slate-700 space-y-1">
            <div>Message Sent: {delivery?.message ? "yes" : "no"}</div>
            <div>Channel: {Array.isArray(delivery?.deliveries) ? delivery.deliveries.map((d) => d.channel).join(", ") : "-"}</div>
            <div>Template: {followUp?.template || "-"}</div>
            <div>Final State: {finalState || retentionState?.retentionStatus || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRetentionSimulator;
