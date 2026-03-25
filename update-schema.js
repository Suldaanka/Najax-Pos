const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. User
schema = schema.replace(
  '  sessions         Session[]\n\n  @@index([activeBusinessId])',
  '  sessions         Session[]\n  auditLogs        AuditLog[]\n\n  @@index([activeBusinessId])'
);

// 2. BusinessMember
schema = schema.replace(
  '  role       Role     @default(STAFF)\n  createdAt  DateTime @default(now())',
  '  role       Role     @default(STAFF)\n  branchId   String?\n  createdAt  DateTime @default(now())'
);
schema = schema.replace(
  '  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, businessId])',
  '  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  branch     Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)\n\n  @@unique([userId, businessId])'
);
schema = schema.replace(
  '  @@index([businessId])\n}',
  '  @@index([businessId])\n  @@index([branchId])\n}'
);

// 3. Business
schema = schema.replace(
  '  stockLogs          StockLog[]\n}',
  '  stockLogs          StockLog[]\n  branches           Branch[]\n  auditLogs          AuditLog[]\n}'
);

// 4. Product
schema = schema.replace(
  '  stockLogs         StockLog[]\n\n  @@unique([businessId, barcode])',
  '  stockLogs         StockLog[]\n  inventoryLevels   InventoryLevel[]\n\n  @@unique([businessId, barcode])'
);

// 5. Customer
schema = schema.replace(
  '  businessId String\n  name       String',
  '  businessId String\n  branchId   String?\n  name       String'
);
schema = schema.replace(
  '  sales      Sale[]\n\n  @@index([businessId])',
  '  sales      Sale[]\n  branch     Branch?  @relation(fields: [branchId], references: [id])\n\n  @@index([businessId])\n  @@index([branchId])'
);

// 6. Sale
schema = schema.replace(
  '  businessId         String\n  staffId            String?',
  '  businessId         String\n  branchId           String?\n  staffId            String?'
);
schema = schema.replace(
  '  staff              User?         @relation(fields: [staffId], references: [id])\n  items              SaleItem[]',
  '  staff              User?         @relation(fields: [staffId], references: [id])\n  branch             Branch?       @relation(fields: [branchId], references: [id])\n  items              SaleItem[]'
);
schema = schema.replace(
  '  @@index([customerId])\n}',
  '  @@index([customerId])\n  @@index([branchId])\n}'
);

// 7. Expense
schema = schema.replace(
  '  businessId  String\n  userId      String',
  '  businessId  String\n  branchId    String?\n  userId      String'
);
schema = schema.replace(
  '  user        User     @relation(fields: [userId], references: [id])\n\n  @@index([businessId])',
  '  user        User     @relation(fields: [userId], references: [id])\n  branch      Branch?  @relation(fields: [branchId], references: [id])\n\n  @@index([businessId])'
);
schema = schema.replace(
  '  @@index([userId])\n}',
  '  @@index([userId])\n  @@index([branchId])\n}'
);

// 8. Purchase
schema = schema.replace(
  '  businessId  String\n  supplierId  String',
  '  businessId  String\n  branchId    String?\n  supplierId  String'
);
schema = schema.replace(
  '  supplier    Supplier       @relation(fields: [supplierId], references: [id])\n  items       PurchaseItem[]',
  '  supplier    Supplier       @relation(fields: [supplierId], references: [id])\n  branch      Branch?        @relation(fields: [branchId], references: [id])\n  items       PurchaseItem[]'
);
schema = schema.replace(
  '  @@index([supplierId])\n}',
  '  @@index([supplierId])\n  @@index([branchId])\n}'
);

// 9. StockLog
schema = schema.replace(
  '  businessId String\n  productId  String',
  '  businessId String\n  branchId   String?\n  productId  String'
);
schema = schema.replace(
  '  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)\n\n  @@index([businessId])',
  '  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)\n  branch     Branch?  @relation(fields: [branchId], references: [id])\n\n  @@index([businessId])'
);
schema = schema.replace(
  '  @@index([productId])\n}',
  '  @@index([productId])\n  @@index([branchId])\n}'
);

// Appending Models
const newModels = `
model Branch {
  id         String   @id @default(cuid())
  businessId String
  name       String
  address    String?
  phone      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  isMain     Boolean  @default(false)
  
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  inventoryLevels InventoryLevel[]
  sales           Sale[]
  purchases       Purchase[]
  expenses        Expense[]
  stockLogs       StockLog[]
  staff           BusinessMember[]
  customers       Customer[]

  @@index([businessId])
}

model InventoryLevel {
  id            String  @id @default(cuid())
  productId     String
  branchId      String
  stockQuantity Decimal @default(0)
  
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  branch  Branch  @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@unique([productId, branchId])
  @@index([branchId])
}

model AuditLog {
  id         String      @id @default(cuid())
  businessId String
  userId     String
  action     AuditAction
  entity     String      // e.g., "PRODUCT", "SALE", "STAFF"
  entityId   String?     // The ID of the modified record
  details    String?     // JSON string containing previous/new values or descriptive message
  createdAt  DateTime    @default(now())
  
  business   Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([businessId])
  @@index([userId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}
`;

schema = schema + "\n" + newModels;

fs.writeFileSync(schemaPath, schema);
console.log("Schema updated successfully.");
