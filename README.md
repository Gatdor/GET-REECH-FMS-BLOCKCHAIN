# Fisheries Management System (FMS) for Dry Fish in East Africa

A web-based, scalable platform designed to support small-scale fishers and cooperatives in digitizing the dry fish value chain — including product cataloging, inventory management, buyer interaction, and compliance monitoring.

---

  Overview

The FMS is aimed at:
- Enhancing visibility of dry fish in formal markets
- Providing tools for inventory tracking and traceability
- Improving transparency, data quality, and compliance
- Empowering cooperatives and enabling regional trade

---

 Core Modules

| Module           | Description                                                |
|------------------|------------------------------------------------------------|
| 🐟 Dry Fish Catalog | Allows fishers to register dry fish species and batches    |
| 📦 Inventory System | Tracks available stock across cooperatives and processors  |
| 🛒 Buyer Portal     | Enables bulk buyers to browse listings and make orders     |
| 📊 Admin Dashboard  | Supports compliance reports and traceability metrics       |

---

 🛠️ Tech Stack

| Layer     | Stack                  |
|-----------|------------------------|
| Frontend  | HTML/CSS/JS *(or React)* |
| Backend   | lavrel 8 |
| Database  | PostgreSQL / SQLite    |
| Hosting   | GitHub Pages / Render / Heroku |
# ☁️ Cloud Integration & System Architecture — Fisheries Management System (FMS)

A visual collection showcasing how the Fisheries Management System (FMS) integrates cloud services, enables traceability, and supports fishers and buyers through an accessible, secure, and data-driven platform.

---

## ☁️ Cloud Integration Overview

This diagram illustrates how FMS interacts with cloud-based infrastructure for:

- ✅ Real-time data syncing between mobile and web clients
- 🔐 Secure storage via services like Supabase or IPFS
- 🌍 Decentralized tracking using optional blockchain integration
- 📱 Offline-first support for low-connectivity fishing communities

![System to Cloud Diagram](https://github.com/user-attachments/assets/b7c85241-5baf-4faf-874e-41650d777252)

---

## 🌍 Platform Architecture Overview

Shows the layered architecture of the FMS platform:
- Frontend (React + Vite)
- Backend APIs (Supabase, Node.js)
- Blockchain/IPFS for data integrity
- Client devices with offline/online modes

![Architecture Overview](https://github.com/user-attachments/assets/74172459-b307-4b51-8e46-ae41b90fa322)

---

## 🔄 Data Flow Diagram

Maps out how data travels within the system:
- Catch details recorded by fishers
- Validated by admins
- Accessed by buyers via marketplace UI
- Orders processed and tracked

![Data Flow Diagram](https://github.com/user-attachments/assets/7e0ee364-47e8-4fdd-9804-203cf19dd95e)

---

## 🗂️ Entity Relationship Diagram (ERD)

Outlines the relational database model:
- Fishers, buyers, and admins as key actors
- Dry fish categories (species, location, method)
- Orders linking fish to buyers

![Entity Relationship Diagram](https://github.com/user-attachments/assets/0781e598-03aa-49d1-a5a9-82ac6daedac3)

---

## 🧑‍⚖️ Use Case Diagram

Highlights key user actions:
- Fishers register catches
- Buyers place orders
- Admins manage platform activity and users

![Use Case Diagram](https://github.com/user-attachments/assets/056d906d-c333-438d-8955-f85d3779bc43)

---

## 📈 Dashboard Analytics (Pie Chart)

Displays how the system generates data insights:
- Distribution of fish types
- Trends in catch volume
- Buyer engagement metrics

![Pie Chart Analytics](https://github.com/user-attachments/assets/0d0e4e3f-d7fa-4da9-9a91-23927f20fb82)

---

## 🌿 Traceability Vision (Getreech Concept)

A conceptual view of a transparent, green supply chain empowered by FMS:
- Eco-friendly fishing practices
- Digital documentation
- Full visibility from catch to consumer

![Getreech Traceability](https://github.com/user-attachments/assets/6daf30d2-fb2a-44ee-a4b3-ac5409a98b37)

---

   Setup Instructions

 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
