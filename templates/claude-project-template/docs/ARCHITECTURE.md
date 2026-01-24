# System Architecture - {{PROJECT_NAME}}

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
{{ASCII_DIAGRAM}}
```

### 1.2 Design Principles

1. **{{PRINCIPLE_1}}:** {{EXPLANATION}}
2. **{{PRINCIPLE_2}}:** {{EXPLANATION}}
3. **{{PRINCIPLE_3}}:** {{EXPLANATION}}

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | {{FRAMEWORK}} | {{PURPOSE}} |
| State | {{STATE_MGMT}} | {{PURPOSE}} |
| Styling | {{CSS}} | {{PURPOSE}} |

### 2.2 Application Structure

```
src/
├── app/                      # Routes/pages
├── components/               # React components
│   ├── ui/                   # Base components
│   └── features/             # Feature components
├── lib/                      # Utilities
├── hooks/                    # Custom hooks
└── types/                    # TypeScript types
```

---

## 3. Backend Architecture

### 3.1 API Endpoints

```
{{API_STRUCTURE}}
```

### 3.2 Data Flow

```
Request → {{STEP_1}} → {{STEP_2}} → Response
```

---

## 4. Data Architecture

### 4.1 Database Schema

```
Table: {{TABLE_NAME}}
├── id: {{TYPE}}
├── {{FIELD}}: {{TYPE}}
└── timestamps
```

### 4.2 Storage Structure

```
{{STORAGE_PATH}}/
├── {{FOLDER_1}}/
└── {{FOLDER_2}}/
```

---

## 5. Infrastructure

### 5.1 Resource Map

```
{{INFRASTRUCTURE_DIAGRAM}}
```

### 5.2 Deployment Pipeline

```
Push → Build → Test → Deploy
```

---

## 6. Security

### 6.1 Security Measures

| Layer | Measure |
|-------|---------|
| Transport | {{MEASURE}} |
| Auth | {{MEASURE}} |
| Data | {{MEASURE}} |

---

## 7. Monitoring

### 7.1 Metrics

- {{METRIC_1}}
- {{METRIC_2}}

### 7.2 Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| {{ALERT}} | {{CONDITION}} | {{ACTION}} |
