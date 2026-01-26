[
  {
    "estrutura_banco": {
      "tabela": "audit_logs",
      "colunas": [
        "id (bigint)",
        "table_name (text)",
        "operation (text)",
        "record_id (text)",
        "old_data (jsonb)",
        "new_data (jsonb)",
        "changed_by (uuid)",
        "company_id (bigint)",
        "created_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "cashier_sessions",
      "colunas": [
        "id (bigint)",
        "opened_at (timestamp with time zone)",
        "closed_at (timestamp with time zone)",
        "employee_id (bigint)",
        "initial_balance (numeric)",
        "final_balance (numeric)",
        "system_balance (numeric)",
        "difference (numeric)",
        "status (text)",
        "notes (text)",
        "type (text)",
        "company_id (bigint)",
        "closing_data (jsonb)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "cashier_transactions",
      "colunas": [
        "id (bigint)",
        "company_id (bigint)",
        "session_id (bigint)",
        "type (text)",
        "amount (numeric)",
        "description (text)",
        "payment_method (text)",
        "created_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "categories",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "type (text)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "companies",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "cnpj (text)",
        "created_at (timestamp with time zone)",
        "status (text)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "company_settings",
      "colunas": [
        "id (bigint)",
        "company_name (text)",
        "cnpj (text)",
        "created_at (timestamp with time zone)",
        "cep (text)",
        "address (text)",
        "city (text)",
        "state_registration (text)",
        "municipal_registration (text)",
        "tax_regime (text)",
        "service_fee (numeric)",
        "kds_alert_time (integer)",
        "company_id (bigint)",
        "print_mode (text)",
        "updated_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "discounts_config",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "type (text)",
        "value (numeric)",
        "active (boolean)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "employee_occurrences",
      "colunas": [
        "id (bigint)",
        "employee_id (bigint)",
        "type (text)",
        "description (text)",
        "severity (text)",
        "date (date)",
        "created_at (timestamp with time zone)",
        "location (text)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "employees",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "role (text)",
        "email (text)",
        "phone (text)",
        "status (text)",
        "avatar (text)",
        "admission_date (date)",
        "created_at (timestamp with time zone)",
        "password (text)",
        "access_pin (text)",
        "company_id (bigint)",
        "auth_user_id (uuid)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "employees_security_cache",
      "colunas": [
        "auth_user_id (uuid)",
        "company_id (bigint)",
        "role (text)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "financial_groups_list",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "financial_transactions",
      "colunas": [
        "id (bigint)",
        "created_at (timestamp with time zone)",
        "cashier_session_id (bigint)",
        "type (text)",
        "amount (numeric)",
        "payment_method (text)",
        "description (text)",
        "created_by (bigint)",
        "category (text)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "fiscal_config",
      "colunas": [
        "id (bigint)",
        "environment (text)",
        "csc_token (bytea)",
        "csc_id (text)",
        "certificate_password (bytea)",
        "updated_at (timestamp with time zone)",
        "company_id (bigint)",
        "client_id (text)",
        "client_secret (text)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "fiscal_sequences",
      "colunas": [
        "id (bigint)",
        "company_id (bigint)",
        "environment (text)",
        "serie (integer)",
        "last_number (bigint)",
        "updated_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "ifood_menu_mapping",
      "colunas": [
        "id (uuid)",
        "company_id (bigint)",
        "ifood_product_id (text)",
        "ifood_product_name (text)",
        "erp_product_id (bigint)",
        "created_at (timestamp with time zone)",
        "updated_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "ifood_orders_raw",
      "colunas": [
        "id (uuid)",
        "company_id (bigint)",
        "ifood_order_id (text)",
        "full_json (jsonb)",
        "status (text)",
        "error_message (text)",
        "created_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "integrations_ifood",
      "colunas": [
        "id (bigint)",
        "company_id (bigint)",
        "merchant_id (text)",
        "status (text)",
        "auto_accept (boolean)",
        "last_poll (timestamp with time zone)",
        "created_at (timestamp with time zone)",
        "auto_print (boolean)",
        "updated_at (timestamp with time zone)",
        "client_id (text)",
        "client_secret (bytea)",
        "temp_verifier (text)",
        "access_token (bytea)",
        "refresh_token (bytea)",
        "last_synced_at (timestamp with time zone)",
        "error_log (jsonb)",
        "connection_status (text)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "payment_methods",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "active (boolean)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "pending_actions",
      "colunas": [
        "id (bigint)",
        "created_at (timestamp with time zone)",
        "type (text)",
        "status (text)",
        "created_by (bigint)",
        "reviewed_by (bigint)",
        "data (jsonb)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "product_ingredients",
      "colunas": [
        "id (bigint)",
        "product_id (bigint)",
        "ingredient_id (bigint)",
        "quantity (numeric)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "products",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "description (text)",
        "price (numeric)",
        "cost_price (numeric)",
        "stock_quantity (numeric)",
        "min_stock_quantity (numeric)",
        "unit (text)",
        "category_id (bigint)",
        "is_composite (boolean)",
        "image_url (text)",
        "active (boolean)",
        "created_at (timestamp with time zone)",
        "type (text)",
        "track_stock (boolean)",
        "barcode (text)",
        "financial_group (text)",
        "destination (text)",
        "stock_category (text)",
        "ncm (text)",
        "cest (text)",
        "cfop (text)",
        "origin (text)",
        "tax_group_id (bigint)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "sale_items",
      "colunas": [
        "id (bigint)",
        "sale_id (bigint)",
        "product_id (bigint)",
        "quantity (numeric)",
        "unit_price (numeric)",
        "total_price (numeric)",
        "status (text)",
        "company_id (bigint)",
        "product_name (text)",
        "total (numeric)",
        "observation (text)",
        "created_at (timestamp with time zone)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "sale_payments",
      "colunas": [
        "id (bigint)",
        "sale_id (bigint)",
        "payment_method (text)",
        "amount (numeric)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "sales",
      "colunas": [
        "id (bigint)",
        "created_at (timestamp with time zone)",
        "employee_id (bigint)",
        "customer_name (text)",
        "status (text)",
        "payment_method (text)",
        "total (numeric)",
        "table_number (integer)",
        "fiscal_status (text)",
        "fiscal_key (text)",
        "protocol_number (text)",
        "xml_url (text)",
        "pdf_url (text)",
        "fiscal_message (text)",
        "discount_value (numeric)",
        "discount_reason (text)",
        "company_id (bigint)",
        "channel (text)",
        "ifood_order_id (text)",
        "cashier_session_id (bigint)",
        "display_id (text)",
        "notes (text)",
        "people_count (integer)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "stock_categories_list",
      "colunas": [
        "id (bigint)",
        "name (text)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "stock_movements",
      "colunas": [
        "id (bigint)",
        "created_at (timestamp with time zone)",
        "product_id (bigint)",
        "employee_id (bigint)",
        "type (text)",
        "reason (text)",
        "quantity (numeric)",
        "old_stock (numeric)",
        "new_stock (numeric)",
        "approved_by (bigint)",
        "company_id (bigint)"
      ]
    }
  },
  {
    "estrutura_banco": {
      "tabela": "units_list",
      "colunas": [
        "id (bigint)",
        "symbol (text)",
        "name (text)",
        "created_at (timestamp with time zone)",
        "company_id (bigint)"
      ]
    }
  }
]