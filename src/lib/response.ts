import { NextResponse } from "next/server";

export const okResponse = (data: any, params: ResponseInit = {}) => {
  return NextResponse.json(data, { status: 200, ...params });
};

export const createdResponse = (data: any, params: ResponseInit = {}) => {
  return NextResponse.json(data, { status: 201, ...params });
};

export const noContentResponse = (params: ResponseInit = {}) => {
  return new NextResponse(null, { status: 204, ...params });
};

export const badRequestResponse = (data: any, params: ResponseInit = {}) => {
  return NextResponse.json(data, { status: 400, ...params });
};

export const unauthorizedResponse = (data: any, params: ResponseInit = {}) => {
  return NextResponse.json(data, { status: 401, ...params });
};

export const forbiddenResponse = (data: any, params: ResponseInit = {}) => {
  return NextResponse.json(data, { status: 403, ...params });
};

export const notFoundResponse = (data: any, params: ResponseInit = {}) => {
  return NextResponse.json(data, { status: 404, ...params });
};

// validation
export const validationErrorResponse = (
  data: any,
  params: ResponseInit = {},
) => {
  return NextResponse.json(data, { status: 422, ...params });
};

export const internalServerErrorResponse = (
  data: any,
  params: ResponseInit = {},
) => {
  return NextResponse.json(data, { status: 500, ...params });
};
