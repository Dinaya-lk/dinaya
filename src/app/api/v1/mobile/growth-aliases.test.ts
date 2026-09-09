import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: vi.fn(async () => undefined),
}));

import { GET as desktopReviewGET, PATCH as desktopReviewPATCH } from "@/app/api/v1/desktop/reviews/[id]/route";
import { GET as mobileReviewGET, PATCH as mobileReviewPATCH } from "@/app/api/v1/mobile/reviews/[id]/route";
import { GET as desktopAutomationGET, PATCH as desktopAutomationPATCH } from "@/app/api/v1/desktop/automations/[id]/route";
import { GET as mobileAutomationGET, PATCH as mobileAutomationPATCH } from "@/app/api/v1/mobile/automations/[id]/route";
import { GET as desktopPaymentsGET } from "@/app/api/v1/desktop/payments/route";
import { GET as mobilePaymentsGET } from "@/app/api/v1/mobile/payments/route";
import { GET as desktopPaymentGET } from "@/app/api/v1/desktop/payments/[id]/route";
import { GET as mobilePaymentGET } from "@/app/api/v1/mobile/payments/[id]/route";
import { GET as desktopReportsGET } from "@/app/api/v1/desktop/reports/route";
import { GET as mobileReportsGET } from "@/app/api/v1/mobile/reports/route";
import { GET as desktopSettingsGET, PATCH as desktopSettingsPATCH } from "@/app/api/v1/desktop/settings/route";
import { GET as mobileSettingsGET, PATCH as mobileSettingsPATCH } from "@/app/api/v1/mobile/settings/route";
import { POST as desktopAiReactivatePOST } from "@/app/api/v1/desktop/ai/reactivate/route";
import { POST as mobileAiReactivatePOST } from "@/app/api/v1/mobile/ai/reactivate/route";
import { GET as desktopAiGET } from "@/app/api/v1/desktop/ai/route";
import { GET as mobileAiGET } from "@/app/api/v1/mobile/ai/route";
import { POST as desktopAiContentPOST } from "@/app/api/v1/desktop/ai/content/route";
import { POST as mobileAiContentPOST } from "@/app/api/v1/mobile/ai/content/route";
import { PATCH as desktopAiContentPATCH } from "@/app/api/v1/desktop/ai/content/[id]/route";
import { PATCH as mobileAiContentPATCH } from "@/app/api/v1/mobile/ai/content/[id]/route";
import { GET as desktopDealGET, PATCH as desktopDealPATCH } from "@/app/api/v1/desktop/deals/[id]/route";
import { GET as mobileDealGET, PATCH as mobileDealPATCH } from "@/app/api/v1/mobile/deals/[id]/route";
import { POST as desktopDealsPOST } from "@/app/api/v1/desktop/deals/route";
import { POST as mobileDealsPOST } from "@/app/api/v1/mobile/deals/route";
import { GET as desktopBroadcastGET } from "@/app/api/v1/desktop/broadcasts/[id]/route";
import { GET as mobileBroadcastGET } from "@/app/api/v1/mobile/broadcasts/[id]/route";
import { POST as desktopBroadcastsPOST } from "@/app/api/v1/desktop/broadcasts/route";
import { POST as mobileBroadcastsPOST } from "@/app/api/v1/mobile/broadcasts/route";
import { POST as desktopBroadcastTriggerPOST } from "@/app/api/v1/desktop/broadcasts/[id]/trigger/route";
import { POST as mobileBroadcastTriggerPOST } from "@/app/api/v1/mobile/broadcasts/[id]/trigger/route";
import { POST as desktopBroadcastSendTestPOST } from "@/app/api/v1/desktop/broadcasts/[id]/send-test/route";
import { POST as mobileBroadcastSendTestPOST } from "@/app/api/v1/mobile/broadcasts/[id]/send-test/route";
import { GET as desktopMarketingGET, PATCH as desktopMarketingPATCH } from "@/app/api/v1/desktop/marketing/[id]/route";
import { GET as mobileMarketingGET, PATCH as mobileMarketingPATCH } from "@/app/api/v1/mobile/marketing/[id]/route";
import { GET as desktopIntegrationGET } from "@/app/api/v1/desktop/integrations/[id]/route";
import { GET as mobileIntegrationGET } from "@/app/api/v1/mobile/integrations/[id]/route";

describe("mobile growth and configure aliases", () => {
  it("aliases review detail reads and owner replies", () => {
    expect(mobileReviewGET).toBe(desktopReviewGET);
    expect(mobileReviewPATCH).toBe(desktopReviewPATCH);
  });

  it("aliases automation detail reads and toggles", () => {
    expect(mobileAutomationGET).toBe(desktopAutomationGET);
    expect(mobileAutomationPATCH).toBe(desktopAutomationPATCH);
  });

  it("aliases payments list and detail", () => {
    expect(mobilePaymentsGET).toBe(desktopPaymentsGET);
    expect(mobilePaymentGET).toBe(desktopPaymentGET);
  });

  it("aliases reports", () => {
    expect(mobileReportsGET).toBe(desktopReportsGET);
  });

  it("aliases settings reads and writes", () => {
    expect(mobileSettingsGET).toBe(desktopSettingsGET);
    expect(mobileSettingsPATCH).toBe(desktopSettingsPATCH);
  });

  it("aliases AI hub, reactivation, and content writes", () => {
    expect(mobileAiGET).toBe(desktopAiGET);
    expect(mobileAiReactivatePOST).toBe(desktopAiReactivatePOST);
    expect(mobileAiContentPOST).toBe(desktopAiContentPOST);
    expect(mobileAiContentPATCH).toBe(desktopAiContentPATCH);
  });

  it("aliases deal detail reads and toggles", () => {
    expect(mobileDealGET).toBe(desktopDealGET);
    expect(mobileDealPATCH).toBe(desktopDealPATCH);
  });

  it("aliases deal create without duplicating logic", () => {
    expect(mobileDealsPOST).toBe(desktopDealsPOST);
  });

  it("aliases broadcast detail, trigger, and send-test", () => {
    expect(mobileBroadcastGET).toBe(desktopBroadcastGET);
    expect(mobileBroadcastTriggerPOST).toBe(desktopBroadcastTriggerPOST);
    expect(mobileBroadcastSendTestPOST).toBe(desktopBroadcastSendTestPOST);
  });

  it("aliases broadcast create without duplicating logic", () => {
    expect(mobileBroadcastsPOST).toBe(desktopBroadcastsPOST);
  });

  it("aliases marketing detail and integration detail", () => {
    expect(mobileMarketingGET).toBe(desktopMarketingGET);
    expect(mobileMarketingPATCH).toBe(desktopMarketingPATCH);
    expect(mobileIntegrationGET).toBe(desktopIntegrationGET);
  });
});
