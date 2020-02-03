export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface HttpResponse<T> extends Response {
  parsedBody?: T;
}

export async function http<T>(request): Promise<HttpResponse<T>> {
  const response: HttpResponse<T> = await fetch(request);

  try {
    // may error if there is no body
    response.parsedBody = await response.json();
  } catch (ex) {}

  if (!response.ok) {
    throw new Error(`Status: ${response.status}, ${response.statusText}`);
  }
  return response;
}