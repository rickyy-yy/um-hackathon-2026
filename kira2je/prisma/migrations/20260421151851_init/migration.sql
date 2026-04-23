-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "costPercent" DOUBLE PRECISION,
    "category" TEXT,
    "isDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryCommission" DOUBLE PRECISION,
    "addedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateRangeFrom" TIMESTAMP(3) NOT NULL,
    "dateRangeTo" TIMESTAMP(3) NOT NULL,
    "reportData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatIfTurn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatIfTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaBenchmark" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "SalesRecord_menuItemId_date_idx" ON "SalesRecord"("menuItemId", "date");

-- CreateIndex
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatIfTurn_userId_reportId_idx" ON "WhatIfTurn"("userId", "reportId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaBenchmark_itemName_area_key" ON "AreaBenchmark"("itemName", "area");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatIfTurn" ADD CONSTRAINT "WhatIfTurn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
