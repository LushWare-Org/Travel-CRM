import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChurnModelPredictorService {
  constructor() {
    this.modelPath = path.resolve(__dirname, '../models/advanced_xgb_churn_model.pkl');
    this.predictScriptPath = path.resolve(__dirname, './scripts/risk_predict.py');
  }

  async predictBatch(records, options = {}) {
    const pythonBin = process.env.RISK_MODEL_PYTHON_BIN || 'python';
    const payload = {
      model_path: options.modelPath || this.modelPath,
      records,
    };

    const result = await new Promise((resolve, reject) => {
      const child = spawn(pythonBin, [this.predictScriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', (error) => {
        reject(error);
      });
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`risk predictor failed with code ${code}: ${stderr || 'unknown error'}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`invalid risk predictor response: ${error.message}`));
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });

    if (!Array.isArray(result.probabilities)) {
      throw new Error('risk predictor did not return probability array');
    }

    return {
      probabilities: result.probabilities,
      modelVersion: result.model_version || 'advanced_xgb_churn_model',
      requiredColumns: result.required_columns || [],
    };
  }
}

const churnModelPredictorService = new ChurnModelPredictorService();
export default churnModelPredictorService;
