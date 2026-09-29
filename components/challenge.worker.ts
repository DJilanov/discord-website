interface ChallengeMessage {
  challenge: string;
  difficulty: number;
}
self.onmessage = async (
  event: MessageEvent<ChallengeMessage>,
): Promise<void> => {
  const { challenge, difficulty } = event.data;
  const encoder = new TextEncoder();
  for (let counter = 0; counter < 1000000; counter++) {
    const hash = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(`${challenge}:${counter}`),
      ),
    );
    if (difficulty === 3 && hash[0] === 0 && hash[1] < 16) {
      self.postMessage({ token: `${challenge}.${counter}` });
      return;
    }
  }
  throw new Error("Submission check exceeded its work limit.");
};
