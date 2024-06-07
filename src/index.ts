import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap, ic } from "azle";
import express from "express";

/**
 * Represents an insurance policy.
 */
class InsurancePolicy {
  id: string;
  policyholder: string;
  coverageAmount: number;
  premium: number;
  duration: number; // Duration in months
  createdAt: Date;
  updatedAt: Date | null;
  transactionHistory: string[]; // Array to store transaction history
}

/**
 * Represents an insurance claim.
 */
class InsuranceClaim {
  id: string;
  policyId: string;
  claimAmount: number;
  incidentDescription: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date | null;
  transactionHistory: string[]; // Array to store transaction history
}

const insurancePoliciesStorage = StableBTreeMap<string, InsurancePolicy>(0);
const insuranceClaimsStorage = StableBTreeMap<string, InsuranceClaim>(1);

export default Server(() => {
  const app = express();
  app.use(express.json());

  // Create a new insurance policy
  app.post("/policies", (req, res) => {
    const { policyholder, coverageAmount, premium, duration } = req.body;

    // Validate input
    if (
      !policyholder ||
      !coverageAmount ||
      !premium ||
      !duration ||
      coverageAmount <= 0 ||
      premium <= 0 ||
      duration <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid input. All fields are required and must be positive numbers",
      });
    }

    const policy: InsurancePolicy = {
      id: uuidv4(),
      policyholder,
      coverageAmount,
      premium,
      duration,
      createdAt: getCurrentDate(),
      updatedAt: null,
      transactionHistory: [`Policy created by ${policyholder}`],
    };
    insurancePoliciesStorage.insert(policy.id, policy);
    res.json(policy);
  });

  // Get all insurance policies
  app.get("/policies", (req, res) => {
    res.json(insurancePoliciesStorage.values());
  });

  // Get a specific insurance policy
  app.get("/policies/:id", (req, res) => {
    const policyId = req.params.id;
    const policyOpt = insurancePoliciesStorage.get(policyId);
    if ("None" in policyOpt) {
      res.status(404).send(`Policy with ID=${policyId} not found`);
    } else {
      res.json(policyOpt.Some);
    }
  });

  // Update an insurance policy
  app.put("/policies/:id", (req, res) => {
    const policyId = req.params.id;
    const { policyholder, coverageAmount, premium, duration } = req.body;

    // Validate input
    if (!policyholder && !coverageAmount && !premium && !duration) {
      return res.status(400).json({
        error:
          "At least one field (policyholder, coverageAmount, premium, duration) must be provided",
      });
    }

    const policyOpt = insurancePoliciesStorage.get(policyId);
    if ("None" in policyOpt) {
      res.status(400).send(`Policy with ID=${policyId} not found`);
    } else {
      const policy = policyOpt.Some;
      const updatedPolicy = {
        ...policy,
        ...req.body,
        updatedAt: getCurrentDate(),
        transactionHistory: [
          ...policy.transactionHistory,
          `Policy updated by ${policyholder || policy.policyholder}`,
        ],
      };
      insurancePoliciesStorage.insert(policy.id, updatedPolicy);
      res.json(updatedPolicy);
    }
  });

  // Delete an insurance policy
  app.delete("/policies/:id", (req, res) => {
    const policyId = req.params.id;
    const deletedPolicy = insurancePoliciesStorage.remove(policyId);
    if ("None" in deletedPolicy) {
      res.status(400).send(`Policy with ID=${policyId} not found`);
    } else {
      res.json(deletedPolicy.Some);
    }
  });

  // Create a new insurance claim
  app.post("/claims", (req, res) => {
    const { policyId, claimAmount, incidentDescription } = req.body;

    // Validate input
    if (!policyId || !claimAmount || !incidentDescription || claimAmount <= 0) {
      return res.status(400).json({
        error:
          "Invalid input. All fields are required and claimAmount must be a positive number",
      });
    }

    const policyOpt = insurancePoliciesStorage.get(policyId);
    if ("None" in policyOpt) {
      return res
        .status(400)
        .json({ error: `Policy with ID=${policyId} not found` });
    }

    const claim: InsuranceClaim = {
      id: uuidv4(),
      policyId,
      claimAmount,
      incidentDescription,
      status: "pending",
      createdAt: getCurrentDate(),
      updatedAt: null,
      transactionHistory: [`Claim created for policy ID ${policyId}`],
    };
    insuranceClaimsStorage.insert(claim.id, claim);
    res.json(claim);
  });

  // Get all insurance claims
  app.get("/claims", (req, res) => {
    res.json(insuranceClaimsStorage.values());
  });

  // Get a specific insurance claim
  app.get("/claims/:id", (req, res) => {
    const claimId = req.params.id;
    const claimOpt = insuranceClaimsStorage.get(claimId);
    if ("None" in claimOpt) {
      res.status(404).send(`Claim with ID=${claimId} not found`);
    } else {
      res.json(claimOpt.Some);
    }
  });

  // Update an insurance claim status
  app.put("/claims/:id/status", (req, res) => {
    const claimId = req.params.id;
    const { status } = req.body;

    // Validate input
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be 'pending', 'approved', or 'rejected'",
      });
    }

    const claimOpt = insuranceClaimsStorage.get(claimId);
    if ("None" in claimOpt) {
      res.status(400).send(`Claim with ID=${claimId} not found`);
    } else {
      const claim = claimOpt.Some;
      const updatedClaim = {
        ...claim,
        status,
        updatedAt: getCurrentDate(),
        transactionHistory: [
          ...claim.transactionHistory,
          `Claim status updated to ${status}`,
        ],
      };
      insuranceClaimsStorage.insert(claim.id, updatedClaim);
      res.json(updatedClaim);
    }
  });

  return app.listen();
});

function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}
