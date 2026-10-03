const fs = require("fs");
const path = "C:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/api-gateway/src/modules/cms/services/cms-admin.service.ts";
let content = fs.readFileSync(path, "utf-8");

const sanitization = `
  private sanitizeContent(content: string): string {
    if (!content) return content;
    const dangerous = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:/gi;
    if (dangerous.test(content)) {
      throw new BadRequestException("Unsafe HTML or JavaScript detected");
    }
    return content;
  }
`;

content = content.replace("async createPage", sanitization + "\n  async createPage");
content = content.replace("content: dto.content", "content: this.sanitizeContent(dto.content)");
content = content.replace("content: dto.content", "content: dto.content ? this.sanitizeContent(dto.content) : dto.content"); // updatePage
content = content.replace("content: dto.content", "content: this.sanitizeContent(dto.content)"); // createAnnouncement
content = content.replace("content: dto.content", "content: dto.content ? this.sanitizeContent(dto.content) : dto.content"); // updateAnnouncement

fs.writeFileSync(path, content);
console.log("Injected basic XSS sanitization");
