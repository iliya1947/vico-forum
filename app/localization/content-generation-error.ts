export class ContentGenerationPlanningUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("content generation planning infrastructure unavailable", options);
    this.name = "ContentGenerationPlanningUnavailableError";
  }
}
