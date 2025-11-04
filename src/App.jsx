import React, { useMemo, useState } from "react";

/**
 * Cloud Infrastructure Order Wizard — Unified (Azure + AWS + GCP)
 * - Requirement steps
 * - Rule-based design generator per cloud
 * - SVG topology diagram (hub + multiple spokes)
 * - CI/CD YAML generator
 * - Policy-as-Code baselines per cloud
 * - Rough cost estimator
 * - Terraform exporters (Azure rich, AWS/GCP minimal)
 */

const STEPS = [
  "Basics",
  "Workloads",
  "Availability & Scale",
  "Security",
  "Networking",
  "Tooling",
  "Summary",
  "Diagram, CI/CD & Policy",
];

const INDUSTRIES = [
  "E-commerce",
  "Finance/Banking",
  "Health/MedTech",
  "Public Sector",
  "Education",
  "Gaming/Media",
  "Manufacturing",
  "Other",
];

const COMPLIANCE = ["GDPR", "ISO 27001", "SOC 2", "HIPAA", "PCI DSS"];

const WORKLOADS = [
  { key: "webapp", label: "Web App / API" },
  { key: "containers", label: "Containers (AKS/EKS/GKE)" },
  { key: "vm", label: "VMs (Lift & Shift)" },
  { key: "data", label: "Data Platform (ETL/Lake/Warehouse)" },
  { key: "serverless", label: "Serverless (Functions/Lambda/Run)" },
  { key: "m365", label: "Microsoft 365 integration" },
];

const REGIONS = [
  { cloud: "Azure", regions: ["Sweden Central", "Sweden South", "North Europe", "West Europe"] },
  { cloud: "AWS", regions: ["eu-north-1 (Stockholm)", "eu-west-1 (Ireland)", "eu-west-2 (London)"] },
  { cloud: "GCP", regions: ["europe-north1 (Finland)", "europe-west1 (Belgium)", "europe-west2 (London)"] },
];

const defaultForm = {
  orgName: "",
  contactEmail: "",
  industry: "",
  preferredCloud: "Azure",
  regions: ["Sweden Central"],
  compliance: ["GDPR"],
  workloads: {
    webapp: true,
    containers: false,
    vm: false,
    data: false,
    serverless: false,
    m365: false,
  },
  availability: {
    slaTier: "99.9%",
    multiRegion: false,
    drRtoHours: 4,
    drRpoMinutes: 30,
    trafficLevel: "moderate", // low|moderate|high|unknown
  },
  security: {
    identityProvider: "Microsoft Entra ID",
    zeroTrust: true,
    privateEndpoints: true,
    ddos: true,
    keyVault: true,
    defender: true,
  },
  networking: {
    topology: "hub-spoke", // hub-spoke | flat | mesh
    addressSpace: "10.10.0.0/16",
    spokeCount: 2,
    onPremConnectivity: "site-to-site", // none | vpn-client-only | site-to-site | expressroute | direct-connect
  },
  tooling: {
    iac: "Terraform",
    cicd: "GitHub Actions",
    monitoring: ["Log Analytics", "App Insights"],
    backup: true,
    costGuardrails: true,
  },
  notes: "",
};

/* ------------ Small UI helpers ------------ */
function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}
function Input({ label, ...props }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
        {...props}
      />
    </label>
  );
}
function Select({ label, options, value, onChange }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
        value={value}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
function TextArea({ label, ...props }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-gray-700">{label}</span>
      <textarea
        className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
        rows={4}
        {...props}
      />
    </label>
  );
}
function Badge({ children }) {
  return (
    <span className="inline-block rounded-full border px-2 py-0.5 text-xs border-gray-300 bg-gray-50 mr-1 mb-1">
      {children}
    </span>
  );
}
function Stepper({ current }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={`flex items-center gap-2 ${i === current ? "font-semibold" : "text-gray-500"}`}
        >
          <span
            className={`w-6 h-6 grid place-items-center rounded-full ${
              i <= current ? "bg-indigo-600 text-white" : "bg-gray-200"
            }`}
          >
            {i + 1}
          </span>
          {s}
          {i < STEPS.length - 1 && <span className="mx-1 text-gray-300">—</span>}
        </li>
      ))}
    </ol>
  );
}

/* ------------ Design generator ------------ */
function generateDesign(form) {
  const cloud = form.preferredCloud;
  const regionPrimary = form.regions[0];
  const regions = Array.from(new Set(form.regions));

  const baseSecurity = {
    identity: form.security.identityProvider,
    keyManagement: form.security.keyVault
      ? cloud === "Azure"
        ? "Azure Key Vault"
        : cloud === "AWS"
        ? "AWS KMS"
        : "Cloud KMS"
      : "",
    defender:
      cloud === "Azure" && form.security.defender
        ? "Microsoft Defender for Cloud"
        : cloud === "AWS" && form.security.defender
        ? "GuardDuty + Security Hub"
        : cloud === "GCP" && form.security.defender
        ? "Security Command Center"
        : "",
    zeroTrust: form.security.zeroTrust,
    privateEndpoints: form.security.privateEndpoints,
  };

  const components = [];
  if (form.workloads.webapp)
    components.push(
      cloud === "Azure" ? "Front Door + App Service" : cloud === "AWS" ? "ALB + ECS/EKS" : "Cloud LB + Cloud Run/App Engine"
    );
  if (form.workloads.containers)
    components.push(cloud === "Azure" ? "AKS + ACR" : cloud === "AWS" ? "EKS + ECR" : "GKE + Artifact Registry");
  if (form.workloads.vm)
    components.push(cloud === "Azure" ? "VM Scale Set" : cloud === "AWS" ? "EC2 ASG" : "Compute Engine MIG");
  if (form.workloads.data)
    components.push(cloud === "Azure" ? "ADLS + Synapse/ADF" : cloud === "AWS" ? "S3 + Glue + Redshift" : "GCS + Dataflow + BigQuery");
  if (form.workloads.serverless)
    components.push(
      cloud === "Azure" ? "Functions + Service Bus" : cloud === "AWS" ? "Lambda + SQS/SNS" : "Cloud Functions + Pub/Sub"
    );
  if (form.workloads.m365 && cloud === "Azure")
    components.push("Entra ID App Registrations + Graph API");

  let landingZone = {};
  if (cloud === "Azure") {
    landingZone = {
      model: form.networking.topology,
      hub: {
        name: `${(form.orgName || "org")}-hub-${regionPrimary}`.toLowerCase().replace(/\s+/g, "-"),
        addressSpace: "10.10.0.0/20",
        subnets: [
          { name: "AzureFirewallSubnet", cidr: "10.10.0.0/24" },
          { name: "AzureBastionSubnet", cidr: "10.10.1.0/27" },
          { name: "shared-services", cidr: "10.10.2.0/24" },
          { name: "private-endpoints", cidr: "10.10.3.0/24" },
        ],
        services: [
          form.security.ddos ? "DDoS Protection" : null,
          "Azure Firewall",
          "Azure Bastion",
          form.security.privateEndpoints ? "Private DNS Zones" : null,
        ].filter(Boolean),
      },
      spokes: Array.from({ length: form.networking.spokeCount }).map((_, idx) => {
        const spokeName = idx === 0 ? "app" : idx === 1 ? "data" : `spoke-${idx + 1}`;
        return {
          name: `${spokeName}-${regionPrimary}`.toLowerCase().replace(/\s+/g, "-"),
          addressSpace: `10.10.${(idx + 1) * 16}.0/20`,
          subnets: [
            { name: "app", cidr: `10.10.${(idx + 1) * 16}.0/24` },
            { name: "data", cidr: `10.10.${(idx + 1) * 16 + 1}.0/24` },
            { name: "admin", cidr: `10.10.${(idx + 1) * 16 + 2}.0/24` },
          ],
          privateEndpoints: form.security.privateEndpoints,
        };
      }),
      connectivity: form.networking.onPremConnectivity,
    };
  } else if (cloud === "AWS") {
    landingZone = {
      model: "vpc-hub-spoke",
      hub: {
        name: `${(form.orgName || "org")}-hub-${regionPrimary}`.toLowerCase().replace(/\s+/g, "-"),
        addressSpace: "10.20.0.0/16",
        subnets: [
          { name: "public-a", cidr: "10.20.0.0/24" },
          { name: "public-b", cidr: "10.20.1.0/24" },
          { name: "private-a", cidr: "10.20.10.0/24" },
          { name: "private-b", cidr: "10.20.11.0/24" },
        ],
        services: ["IGW", "NAT Gateway"],
      },
      spokes: Array.from({ length: Math.max(1, form.networking.spokeCount - 1) }).map((_, idx) => ({
        name: `spoke-${idx + 1}-${regionPrimary}`.toLowerCase().replace(/\s+/g, "-"),
        addressSpace: `10.20.${(idx + 2) * 16}.0/20`,
        subnets: [
          { name: "app", cidr: `10.20.${(idx + 2) * 16}.0/24` },
          { name: "data", cidr: `10.20.${(idx + 2) * 16 + 1}.0/24` },
          { name: "admin", cidr: `10.20.${(idx + 2) * 16 + 2}.0/24` },
        ],
        privateEndpoints: form.security.privateEndpoints,
      })),
      connectivity:
        form.networking.onPremConnectivity === "site-to-site"
          ? "Site-to-Site VPN"
          : form.networking.onPremConnectivity === "expressroute"
          ? "Direct Connect"
          : form.networking.onPremConnectivity,
    };
  } else if (cloud === "GCP") {
    landingZone = {
      model: "vpc-shared",
      hub: {
        name: `${(form.orgName || "org")}-vpc-${regionPrimary}`.toLowerCase().replace(/\s+/g, "-"),
        addressSpace: "10.30.0.0/16",
        subnets: [
          { name: "apps", cidr: "10.30.0.0/24" },
          { name: "data", cidr: "10.30.1.0/24" },
          { name: "admin", cidr: "10.30.2.0/24" },
        ],
        services: ["Cloud NAT", "IAP/Bastion"],
      },
      spokes: Array.from({ length: Math.max(1, form.networking.spokeCount - 1) }).map((_, idx) => ({
        name: `spoke-${idx + 1}-${regionPrimary}`.toLowerCase().replace(/\s+/g, "-"),
        addressSpace: `10.30.${(idx + 1) * 16}.0/20`,
        subnets: [
          { name: "app", cidr: `10.30.${(idx + 1) * 16}.0/24` },
          { name: "data", cidr: `10.30.${(idx + 1) * 16 + 1}.0/24` },
          { name: "admin", cidr: `10.30.${(idx + 1) * 16 + 2}.0/24` },
        ],
        privateEndpoints: form.security.privateEndpoints,
      })),
      connectivity: form.networking.onPremConnectivity,
    };
  }

  return {
    metadata: { generatedAt: new Date().toISOString(), version: 3 },
    order: form,
    design: {
      cloud,
      regions,
      landingZone,
      components,
      security: baseSecurity,
      observability: {
        monitoring: form.tooling.monitoring,
        backup: form.tooling.backup
          ? cloud === "Azure"
            ? "Azure Backup"
            : cloud === "AWS"
            ? "AWS Backup"
            : "Backup/DR"
          : "",
        cost: form.tooling.costGuardrails ? "Budgets + Cost Anomaly Alerts" : "",
      },
      iam: [
        { role: cloud === "AWS" ? "AdministratorAccess" : "Owner", group: "Cloud-Platform-Admins" },
        { role: cloud === "AWS" ? "PowerUserAccess" : "Contributor", group: "Project-DevOps" },
        { role: "Reader", group: "Security-Auditors" },
      ],
      recommendations: [
        "Enforce naming + tagging policy",
        cloud === "Azure"
          ? "Enable Defender for Cloud"
          : cloud === "AWS"
          ? "Enable GuardDuty/Security Hub"
          : "Enable Security Command Center",
        "Use private endpoints/private access for PaaS",
        "Store secrets in managed KMS/Key Vault; use managed identity/service accounts",
      ],
    },
  };
}

/* ------------ Cost (rough) ------------ */
function estimateCost(design) {
  const base = 500;
  const perComponent = 200;
  const count = (design?.design?.components || []).length;
  const est = base + count * perComponent;
  return { monthlyUSD: est, yearlyUSD: est * 12, note: "Rough ballpark only. Plug in real pricing later." };
}

/* ------------ CI/CD YAML ------------ */
function generateCIYAML(form) {
  if (form.tooling.cicd === "GitHub Actions") {
    return `name: CI/CD

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform apply -auto-approve`;
  } else if (form.tooling.cicd === "Azure DevOps") {
    return `trigger:
- main

stages:
- stage: Deploy
  jobs:
  - job: Terraform
    pool:
      vmImage: ubuntu-latest
    steps:
    - checkout: self
    - task: TerraformInstaller@1
      inputs:
        terraformVersion: latest
    - task: TerraformCLI@1
      inputs:
        command: 'init'
    - task: TerraformCLI@1
      inputs:
        command: 'apply'
        commandOptions: '-auto-approve'`;
  } else if (form.tooling.cicd === "GitLab CI") {
    return `stages:
  - deploy

deploy-job:
  stage: deploy
  image: hashicorp/terraform:light
  script:
    - terraform init
    - terraform apply -auto-approve`;
  }
  return "# No CI/CD config generated";
}

/* ------------ Policy Baselines ------------ */
function generatePolicyBaselines(cloud) {
  if (cloud === "Azure") {
    return [
      "Enforce naming convention",
      "Require tags: Owner, CostCenter",
      "Deny public IPs on NICs",
      "Require Private Endpoints for Storage/DB",
      "Enable Defender for Cloud",
    ];
  } else if (cloud === "AWS") {
    return [
      "SCP: deny *:* on root",
      "Tagging policy required",
      "CloudTrail enabled in all regions",
      "AWS Config recorder mandatory",
      "GuardDuty + Security Hub",
    ];
  } else if (cloud === "GCP") {
    return [
      "Org policy: restrict external IPs",
      "Require labels for billing",
      "VPC Service Controls for data services",
      "Enable Security Command Center",
      "Require CMEK for storage",
    ];
  }
  return [];
}

/* ------------ Terraform Exporters ------------ */
function awsRegionCode(label) {
  // "eu-north-1 (Stockholm)" -> "eu-north-1"
  return (label || "eu-north-1").split(" ")[0];
}

function terraformFromDesign(obj) {
  const cloud = obj?.design?.cloud;
  if (cloud === "Azure") return terraformAzure(obj);
  if (cloud === "AWS") return terraformAWS(obj);
  if (cloud === "GCP") return terraformGCP(obj);
  return "# Unsupported cloud";
}

function terraformAzure(obj) {
  const org = (obj?.order?.orgName || "org").toLowerCase().replace(/\s+/g, "-");
  const rgName = `${org}-rg`;
  const location = obj?.order?.regions?.[0] || "Sweden Central";
  const ddosEnabled = !!obj?.order?.security?.ddos;
  const keyVaultEnabled = !!obj?.order?.security?.keyVault;
  const monitoring = obj?.order?.tooling?.monitoring || [];
  const hub = obj?.design?.landingZone?.hub;
  const spokes = obj?.design?.landingZone?.spokes || [];

  const hubSubnetsHcl = (hub?.subnets || [])
    .map(
      (s) => `resource "azurerm_subnet" "hub_${s.name.replace(/-/g, "_")}" {
  name                 = "${s.name}"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["${s.cidr}"]
}
`
    )
    .join("\n");

  const spokesHcl = spokes
    .map((spoke) => {
      const vnetName = `${spoke.name}-vnet`;
      const spokeSubs = (spoke.subnets || [])
        .map(
          (s) => `resource "azurerm_subnet" "${spoke.name.replace(/-/g, "_")}_${s.name}" {
  name                 = "${s.name}"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.${spoke.name.replace(/-/g, "_")}.name
  address_prefixes     = ["${s.cidr}"]
}
`
        )
        .join("\n");

      return `resource "azurerm_virtual_network" "${spoke.name.replace(/-/g, "_")}" {
  name                = "${vnetName}"
  address_space       = ["${spoke.addressSpace}"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

${spokeSubs}

resource "azurerm_virtual_network_peering" "${spoke.name.replace(/-/g, "_")}_to_hub" {
  name                      = "${spoke.name}-to-hub"
  resource_group_name       = azurerm_resource_group.main.name
  virtual_network_name      = azurerm_virtual_network.${spoke.name.replace(/-/g, "_")}.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id
  allow_forwarded_traffic   = true
  allow_gateway_transit     = true
}

resource "azurerm_virtual_network_peering" "hub_to_${spoke.name.replace(/-/g, "_")}" {
  name                      = "hub-to-${spoke.name}"
  resource_group_name       = azurerm_resource_group.main.name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.${spoke.name.replace(/-/g, "_")}.id
  allow_forwarded_traffic   = true
  use_remote_gateways       = true
}
`;
    })
    .join("\n");

  const logAnalyticsHcl = monitoring.includes("Log Analytics")
    ? `resource "azurerm_log_analytics_workspace" "law" {
  name                = "${org}-law"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}
`
    : "";

  const keyVaultHcl = keyVaultEnabled
    ? `resource "azurerm_key_vault" "kv" {
  name                        = "${org}-kv-aaaaaa"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90
}
`
    : "";

  const ddosPlanHcl = ddosEnabled
    ? `resource "azurerm_network_ddos_protection_plan" "ddos" {
  name                = "${org}-ddos"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}
`
    : "";

  const frontDoorHcl = obj?.order?.workloads?.webapp
    ? `resource "azurerm_frontdoor" "fd" {
  name                = "${org}-fd"
  resource_group_name = azurerm_resource_group.main.name
  routing_rule {
    name               = "default"
    accepted_protocols = ["Http", "Https"]
    patterns_to_match  = ["/*"]
    frontend_endpoints = [azurerm_frontdoor.fd.frontend_endpoints[0].name]
    forwarding_configuration {
      forwarding_protocol = "MatchRequest"
      backend_pool_name   = azurerm_frontdoor.fd.backend_pools[0].name
    }
  }
  backend_pool {
    name = "defaultpool"
    backend {
      host_header = "example.com"
      address     = "example.com"
      http_port   = 80
      https_port  = 443
    }
  }
  frontend_endpoint { name = "fe" host_name = "${org}-fe.azurefd.net" }
}
`
    : "";

  return `terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = ">= 3.0" }
  }
}

provider "azurerm" { features {} }

data "azurerm_client_config" "current" {}

variable "project_name" { type = string, default = "${obj?.order?.orgName || "org"}" }

resource "azurerm_resource_group" "main" {
  name     = "${rgName}"
  location = "${location}"
  tags     = { Project = var.project_name, Owner = "Platform Team" }
}

${ddosPlanHcl}
resource "azurerm_virtual_network" "hub" {
  name                = "${(hub?.name || `${org}-hub`)}-vnet"
  address_space       = ["${hub?.addressSpace || "10.10.0.0/20"}"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ${obj?.order?.security?.ddos ? "ddos_protection_plan { id = azurerm_network_ddos_protection_plan.ddos.id }" : ""}
}

${hubSubnetsHcl}

${spokesHcl}

${logAnalyticsHcl}
${keyVaultHcl}
${frontDoorHcl}`;
}

function terraformAWS(obj) {
  const org = (obj?.order?.orgName || "org").toLowerCase().replace(/\s+/g, "-");
  const regionLabel = obj?.order?.regions?.[0] || "eu-north-1 (Stockholm)";
  const region = awsRegionCode(regionLabel);
  return `terraform {
  required_providers { aws = { source = "hashicorp/aws", version = ">= 5.0" } }
}

provider "aws" { region = "${region}" }

resource "aws_vpc" "main" {
  cidr_block = "10.20.0.0/16"
  tags = { Name = "${org}-vpc" }
}

resource "aws_internet_gateway" "igw" { vpc_id = aws_vpc.main.id }

resource "aws_subnet" "public_a" { vpc_id = aws_vpc.main.id cidr_block = "10.20.0.0/24" map_public_ip_on_launch = true }
resource "aws_subnet" "public_b" { vpc_id = aws_vpc.main.id cidr_block = "10.20.1.0/24" map_public_ip_on_launch = true }
resource "aws_subnet" "private_a" { vpc_id = aws_vpc.main.id cidr_block = "10.20.10.0/24" }
resource "aws_subnet" "private_b" { vpc_id = aws_vpc.main.id cidr_block = "10.20.11.0/24" }

resource "aws_eip" "nat" { domain = "vpc" }
resource "aws_nat_gateway" "nat" { allocation_id = aws_eip.nat.id subnet_id = aws_subnet.public_a.id }

resource "aws_route_table" "public" { vpc_id = aws_vpc.main.id }
resource "aws_route" "public_inet" { route_table_id = aws_route_table.public.id destination_cidr_block = "0.0.0.0/0" gateway_id = aws_internet_gateway.igw.id }
resource "aws_route_table_association" "public_a" { subnet_id = aws_subnet.public_a.id route_table_id = aws_route_table.public.id }
resource "aws_route_table_association" "public_b" { subnet_id = aws_subnet.public_b.id route_table_id = aws_route_table.public.id }

resource "aws_route_table" "private" { vpc_id = aws_vpc.main.id }
resource "aws_route" "private_nat" { route_table_id = aws_route_table.private.id destination_cidr_block = "0.0.0.0/0" nat_gateway_id = aws_nat_gateway.nat.id }
resource "aws_route_table_association" "private_a" { subnet_id = aws_subnet.private_a.id route_table_id = aws_route_table.private.id }
resource "aws_route_table_association" "private_b" { subnet_id = aws_subnet.private_b.id route_table_id = aws_route_table.private.id }`;
}

function terraformGCP(obj) {
  const org = (obj?.order?.orgName || "org").toLowerCase().replace(/\s+/g, "-");
  const regionLabel = obj?.order?.regions?.[0] || "europe-north1 (Finland)";
  const region = (regionLabel || "europe-north1").split(" ")[0];
  return `terraform {
  required_providers { google = { source = "hashicorp/google", version = ">= 5.0" } }
}

provider "google" { project = var.project_id region = "${region}" }

variable "project_id" { type = string }

resource "google_compute_network" "vpc" { name = "${org}-vpc" auto_create_subnetworks = false }
resource "google_compute_subnetwork" "apps"  { name = "apps"  ip_cidr_range = "10.30.0.0/24" region = "${region}" network = google_compute_network.vpc.id }
resource "google_compute_subnetwork" "data"  { name = "data"  ip_cidr_range = "10.30.1.0/24" region = "${region}" network = google_compute_network.vpc.id }
resource "google_compute_subnetwork" "admin" { name = "admin" ip_cidr_range = "10.30.2.0/24" region = "${region}" network = google_compute_network.vpc.id }`;
}

/* ------------ Simple SVG Diagram ------------ */
function Diagram({ design }) {
  const hub = design?.design?.landingZone?.hub;
  const spokes = design?.design?.landingZone?.spokes || [];
  const width = 920;
  const height = 420;
  const hubX = 160;
  const hubY = 80;
  const spokeStartX = 480;
  const spokeGapY = 120;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-gray-50 rounded-xl border">
      {/* Hub */}
      <rect x={hubX} y={hubY} width={220} height={180} rx={16} fill="#ffffff" stroke="#cbd5e1" />
      <text x={hubX + 16} y={hubY + 26} fontSize="14" fontWeight="600">
        HUB: {hub?.name}
      </text>
      <text x={hubX + 16} y={hubY + 46} fontSize="12" fill="#475569">
        {hub?.addressSpace}
      </text>
      {(hub?.services || []).slice(0, 4).map((s, i) => (
        <text key={s} x={hubX + 16} y={hubY + 70 + i * 18} fontSize="12">
          • {s}
        </text>
      ))}

      {/* Spokes */}
      {spokes.map((sp, i) => {
        const x = spokeStartX;
        const y = 40 + i * spokeGapY;
        return (
          <g key={sp.name}>
            <line
              x1={hubX + 220}
              y1={hubY + 90}
              x2={x}
              y2={y + 40}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            <rect x={x} y={y} width={360} height={100} rx={12} fill="#ffffff" stroke="#cbd5e1" />
            <text x={x + 12} y={y + 22} fontSize="13" fontWeight="600">
              SPOKE: {sp.name}
            </text>
            <text x={x + 12} y={y + 40} fontSize="12" fill="#475569">
              {sp.addressSpace}
            </text>
            {(sp.subnets || [])
              .slice(0, 3)
              .map((sn, j) => (
                <text key={sn.name} x={x + 12 + j * 110} y={y + 66} fontSize="12">
                  {sn.name}: {sn.cidr}
                </text>
              ))}
          </g>
        );
      })}

      {/* Legend */}
      <rect x={20} y={height - 70} width={880} height={50} rx={10} fill="#ffffff" stroke="#e2e8f0" />
      <text x={30} y={height - 40} fontSize="12" fill="#475569">
        Legend: Hub/VPC with spokes + peering/TGW • Private endpoints/access (optional) • DDoS/Shield •
        Front Door/ALB/Cloud LB
      </text>
    </svg>
  );
}

/* ------------ Main Component ------------ */
export default function CloudOrderWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);

  const regionOptions = useMemo(() => {
    const match = REGIONS.find((r) => r.cloud === form.preferredCloud);
    return match ? match.regions : [];
  }, [form.preferredCloud]);

  const design = useMemo(() => generateDesign(form), [form]);
  const tf = useMemo(() => terraformFromDesign(design), [design]);
  const cost = useMemo(() => estimateCost(design), [design]);
  const ciYaml = useMemo(() => generateCIYAML(form), [form]);
  const policies = useMemo(() => generatePolicyBaselines(form.preferredCloud), [form.preferredCloud]);

  function toggleArrayValue(arr, value) {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(form.orgName || "order").toLowerCase().replace(/\s+/g, "-")}-cloud-order.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTF() {
    const blob = new Blob([tf], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `main.tf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Cloud Infrastructure Order Wizard</h1>
          <p className="text-gray-600">
            Capture requirements, generate a topology, and export deployable artifacts for Azure/AWS/GCP.
          </p>
        </div>

        <div className="mb-6">
          <Stepper current={step} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form Steps */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow p-6">
              {step === 0 && (
                <Section title="Organization & Basics">
                  <Input
                    label="Organization Name"
                    placeholder="Contoso AB"
                    value={form.orgName}
                    onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  />
                  <Input
                    label="Contact Email"
                    placeholder="it@contoso.se"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  />
                  <Select
                    label="Industry"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    options={["", ...INDUSTRIES]}
                  />
                  <Select
                    label="Preferred Cloud"
                    value={form.preferredCloud}
                    onChange={(e) => setForm({ ...form, preferredCloud: e.target.value, regions: [] })}
                    options={["Azure", "AWS", "GCP"]}
                  />
                  <label className="grid gap-1">
                    <span className="text-sm text-gray-700">Regions (pick one or more)</span>
                    <div className="flex flex-wrap gap-2">
                      {regionOptions.map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`px-3 py-1 rounded-full border ${
                            form.regions.includes(r)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white"
                          }`}
                          onClick={() => setForm({ ...form, regions: toggleArrayValue(form.regions, r) })}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm text-gray-700">Compliance</span>
                    <div className="flex flex-wrap gap-3">
                      {COMPLIANCE.map((c) => (
                        <Checkbox
                          key={c}
                          label={c}
                          checked={form.compliance.includes(c)}
                          onChange={() =>
                            setForm({ ...form, compliance: toggleArrayValue(form.compliance, c) })
                          }
                        />
                      ))}
                    </div>
                  </label>
                </Section>
              )}

              {step === 1 && (
                <Section title="Workloads">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {WORKLOADS.map((w) => (
                      <label key={w.key} className="flex items-center gap-3 border rounded-xl p-3">
                        <input
                          type="checkbox"
                          checked={form.workloads[w.key]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              workloads: { ...form.workloads, [w.key]: e.target.checked },
                            })
                          }
                        />
                        <span>{w.label}</span>
                      </label>
                    ))}
                  </div>
                  <TextArea
                    label="Notes about workloads (tech stack, DB choices, traffic patterns)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Section>
              )}

              {step === 2 && (
                <Section title="Availability & Scale">
                  <Select
                    label="Target SLA"
                    value={form.availability.slaTier}
                    onChange={(e) =>
                      setForm({ ...form, availability: { ...form.availability, slaTier: e.target.value } })
                    }
                    options={["99.0%", "99.5%", "99.9%", "99.95%", "99.99%"]}
                  />
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.availability.multiRegion}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          availability: { ...form.availability, multiRegion: e.target.checked },
                        })
                      }
                    />
                    <span>Multi-region active/active or active/standby</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="DR RTO (hours)"
                      type="number"
                      min={0}
                      value={form.availability.drRtoHours}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          availability: { ...form.availability, drRtoHours: Number(e.target.value) },
                        })
                      }
                    />
                    <Input
                      label="DR RPO (minutes)"
                      type="number"
                      min={0}
                      value={form.availability.drRpoMinutes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          availability: { ...form.availability, drRpoMinutes: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <Select
                    label="Expected Traffic"
                    value={form.availability.trafficLevel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        availability: { ...form.availability, trafficLevel: e.target.value },
                      })
                    }
                    options={["low", "moderate", "high", "unknown"]}
                  />
                </Section>
              )}

              {step === 3 && (
                <Section title="Security">
                  <Input
                    label="Identity Provider"
                    value={form.security.identityProvider}
                    onChange={(e) =>
                      setForm({ ...form, security: { ...form.security, identityProvider: e.target.value } })
                    }
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.security.zeroTrust}
                        onChange={(e) =>
                          setForm({ ...form, security: { ...form.security, zeroTrust: e.target.checked } })
                        }
                      />
                      <span>Zero Trust (MFA, PIM, Conditional Access)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.security.privateEndpoints}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            security: { ...form.security, privateEndpoints: e.target.checked },
                          })
                        }
                      />
                      <span>Private Endpoints / Private Access</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.security.ddos}
                        onChange={(e) =>
                          setForm({ ...form, security: { ...form.security, ddos: e.target.checked } })
                        }
                      />
                      <span>DDoS / Shield</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.security.keyVault}
                        onChange={(e) =>
                          setForm({ ...form, security: { ...form.security, keyVault: e.target.checked } })
                        }
                      />
                      <span>Managed KMS/Key Vault</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.security.defender}
                        onChange={(e) =>
                          setForm({ ...form, security: { ...form.security, defender: e.target.checked } })
                        }
                      />
                      <span>Cloud Security Posture (Defender/GuardDuty/SCC)</span>
                    </label>
                  </div>
                </Section>
              )}

              {step === 4 && (
                <Section title="Networking">
                  <Select
                    label="Topology"
                    value={form.networking.topology}
                    onChange={(e) =>
                      setForm({ ...form, networking: { ...form.networking, topology: e.target.value } })
                    }
                    options={["hub-spoke", "flat", "mesh"]}
                  />
                  <Input
                    label="Address Space (CIDR)"
                    value={form.networking.addressSpace}
                    onChange={(e) =>
                      setForm({ ...form, networking: { ...form.networking, addressSpace: e.target.value } })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Spoke Count"
                      type="number"
                      min={1}
                      value={form.networking.spokeCount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          networking: { ...form.networking, spokeCount: Number(e.target.value) },
                        })
                      }
                    />
                    <Select
                      label="On-Prem Connectivity"
                      value={form.networking.onPremConnectivity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          networking: { ...form.networking, onPremConnectivity: e.target.value },
                        })
                      }
                      options={["none", "vpn-client-only", "site-to-site", "expressroute", "direct-connect"]}
                    />
                  </div>
                </Section>
              )}

              {step === 5 && (
                <Section title="Tooling & Ops">
                  <Select
                    label="Infrastructure as Code"
                    value={form.tooling.iac}
                    onChange={(e) =>
                      setForm({ ...form, tooling: { ...form.tooling, iac: e.target.value } })
                    }
                    options={["Terraform", "Bicep", "Pulumi"]}
                  />
                  <Select
                    label="CI/CD"
                    value={form.tooling.cicd}
                    onChange={(e) =>
                      setForm({ ...form, tooling: { ...form.tooling, cicd: e.target.value } })
                    }
                    options={["GitHub Actions", "Azure DevOps", "GitLab CI"]}
                  />
                  <label className="grid gap-1">
                    <span className="text-sm text-gray-700">Monitoring</span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        "Log Analytics",
                        "App Insights",
                        "Prometheus/Grafana",
                        "CloudWatch/CloudTrail",
                        "GCP Cloud Ops",
                      ].map((m) => (
                        <Checkbox
                          key={m}
                          label={m}
                          checked={form.tooling.monitoring.includes(m)}
                          onChange={() =>
                            setForm({
                              ...form,
                              tooling: {
                                ...form.tooling,
                                monitoring: form.tooling.monitoring.includes(m)
                                  ? form.tooling.monitoring.filter((x) => x !== m)
                                  : [...form.tooling.monitoring, m],
                              },
                            })
                          }
                        />
                      ))}
                    </div>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.tooling.backup}
                        onChange={(e) =>
                          setForm({ ...form, tooling: { ...form.tooling, backup: e.target.checked } })
                        }
                      />
                      <span>Enable Backup & Recovery</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.tooling.costGuardrails}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            tooling: { ...form.tooling, costGuardrails: e.target.checked },
                          })
                        }
                      />
                      <span>Budget & Cost Anomaly Alerts</span>
                    </label>
                  </div>
                </Section>
              )}

              {step === 6 && (
                <Section title="Summary">
                  <div className="grid gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Quick Summary</h3>
                      <div className="flex flex-wrap">
                        <Badge>{form.preferredCloud}</Badge>
                        {form.regions.map((r) => (
                          <Badge key={r}>{r}</Badge>
                        ))}
                        {form.compliance.map((c) => (
                          <Badge key={c}>{c}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Recommended Components</h3>
                      <ul className="list-disc ml-6">
                        {design.design.components.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Landing Zone</h3>
                      <pre className="bg-gray-100 p-3 rounded-xl overflow-auto text-xs">
                        {JSON.stringify(design.design.landingZone, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Security & Observability</h3>
                      <pre className="bg-gray-100 p-3 rounded-xl overflow-auto text-xs">
                        {JSON.stringify(
                          { security: design.design.security, observability: design.design.observability },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </Section>
              )}

              {step === 7 && (
                <Section title="Diagram, CI/CD & Policy">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Cost Estimate</h3>
                      <p>${cost.monthlyUSD} / month ≈ ${cost.yearlyUSD} / year</p>
                      <p className="text-xs text-gray-500">{cost.note}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">CI/CD Pipeline Config ({form.tooling.cicd})</h3>
                      <pre className="bg-gray-900 text-green-100 p-3 rounded-xl overflow-auto text-xs">
                        {ciYaml}
                      </pre>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Policy Baselines ({form.preferredCloud})</h3>
                      <ul className="list-disc ml-6">
                        {policies.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Topology Diagram</h3>
                      <Diagram design={design} />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">
                        Terraform (auto-selected for {design.design.cloud})
                      </h3>
                      <pre className="bg-gray-900 text-green-100 p-3 rounded-xl overflow-auto text-xs">
                        {tf}
                      </pre>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={downloadTF}
                          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                        >
                          Download main.tf
                        </button>
                        <button
                          onClick={downloadJSON}
                          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                        >
                          Download Order JSON
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      <p>
                        Note: Azure exporter is richer (hub/spoke + peering, Front Door, Log Analytics, Key Vault
                        stubs). AWS/GCP exporters are minimal VPC/VNet stubs — extend as needed.
                      </p>
                    </div>
                  </div>
                </Section>
              )}

              <div className="flex justify-between pt-4">
                <button
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-40"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                    onClick={() => setStep(7)}
                  >
                    Jump to Diagram & Exports
                  </button>
                  {step < STEPS.length - 1 ? (
                    <button
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={downloadJSON}
                    >
                      Export Order JSON
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Design Preview */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-semibold mb-2">Live Design Preview</h3>
            <pre className="bg-gray-100 p-3 rounded-xl overflow-auto text-xs max-h-[70vh]">
              {JSON.stringify(design, null, 2)}
            </pre>
            <div className="mt-4 text-xs text-gray-500">
              <p>TIP: Adjust selections to see topology/components update in real time. Export Terraform from the final step.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
