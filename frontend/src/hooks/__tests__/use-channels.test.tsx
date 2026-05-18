import { renderHook, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import {
  useChannels,
  useChannel,
  useCreateChannel,
} from "../graphql/use-channels";
import { GET_CHANNELS, GET_CHANNEL, CREATE_CHANNEL } from "@/graphql/channels";
import { ReactNode } from "react";

// Mock auth context
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user1", username: "testuser" },
    loading: false,
  }),
}));

const mockChannelsData = {
  nchat_channels: [
    {
      id: "1",
      name: "general",
      slug: "general",
      description: "General discussion",
      type: "public",
      topic: null,
      is_default: true,
      is_private: false,
      is_archived: false,
      position: 1,
      icon: null,
      settings: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      category_id: null,
      creator: {
        id: "user1",
        username: "admin",
        display_name: "Admin User",
        avatar_url: null,
        status: "online",
        status_emoji: null,
      },
      members_aggregate: {
        aggregate: {
          count: 10,
        },
      },
      __typename: "nchat_channels",
    },
    {
      id: "2",
      name: "random",
      slug: "random",
      description: "Random chat",
      type: "public",
      topic: null,
      is_default: false,
      is_private: false,
      is_archived: false,
      position: 2,
      icon: null,
      settings: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      category_id: null,
      creator: {
        id: "user1",
        username: "admin",
        display_name: "Admin User",
        avatar_url: null,
        status: "online",
        status_emoji: null,
      },
      members_aggregate: {
        aggregate: {
          count: 8,
        },
      },
      __typename: "nchat_channels",
    },
  ],
};

const mockChannelDetailData = {
  nchat_channels: [
    {
      id: "1",
      name: "general",
      slug: "general",
      description: "General discussion",
      type: "public",
      topic: "Welcome to general",
      is_default: true,
      is_private: false,
      is_archived: false,
      position: 1,
      icon: null,
      settings: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      category_id: null,
      creator: {
        id: "user1",
        username: "admin",
        display_name: "Admin User",
        avatar_url: "https://example.com/avatar.jpg",
        status: "online",
        status_emoji: null,
      },
      members_aggregate: {
        aggregate: {
          count: 1,
        },
      },
      members: [],
      pinned_messages: [],
      __typename: "nchat_channels",
    },
  ],
};

describe("useChannels hook", () => {
  const mocks = [
    {
      request: {
        query: GET_CHANNELS,
        variables: {},
      },
      result: {
        data: mockChannelsData,
      },
    },
  ];

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks}>{children}</MockedProvider>
  );

  it("fetches channels successfully", async () => {
    const { result } = renderHook(() => useChannels(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.channels).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channels.length).toBe(2);
    expect(result.current.error).toBeUndefined();
  });

  it("handles empty channels list", async () => {
    const emptyMocks = [
      {
        request: {
          query: GET_CHANNELS,
          variables: {},
        },
        result: {
          data: { nchat_channels: [] },
        },
      },
    ];

    const emptyWrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={emptyMocks}>{children}</MockedProvider>
    );

    const { result } = renderHook(() => useChannels(), {
      wrapper: emptyWrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channels).toEqual([]);
  });

  it("handles query error", async () => {
    const errorMocks = [
      {
        request: {
          query: GET_CHANNELS,
          variables: {},
        },
        error: new Error("Failed to fetch channels"),
      },
    ];

    const errorWrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={errorMocks}>{children}</MockedProvider>
    );

    const { result } = renderHook(() => useChannels(), {
      wrapper: errorWrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.channels).toEqual([]);
  });
});

describe("useChannel hook", () => {
  // Use 'general' as slug since '1' is not a valid UUID
  const mocks = [
    {
      request: {
        query: GET_CHANNEL,
        variables: { slug: "general" },
      },
      result: {
        data: mockChannelDetailData,
      },
    },
  ];

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks}>{children}</MockedProvider>
  );

  it("fetches channel by slug", async () => {
    const { result } = renderHook(() => useChannel("general"), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.channel).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channel?.name).toBe("general");
    expect(result.current.error).toBeUndefined();
  });

  it("skips query when id is empty", () => {
    const { result } = renderHook(() => useChannel(""), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.channel).toBeNull();
  });

  it("handles non-existent channel", async () => {
    const notFoundMocks = [
      {
        request: {
          query: GET_CHANNEL,
          variables: { slug: "non-existent" },
        },
        result: {
          data: { nchat_channels: [] },
        },
      },
    ];

    const notFoundWrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={notFoundMocks}>{children}</MockedProvider>
    );

    const { result } = renderHook(() => useChannel("non-existent"), {
      wrapper: notFoundWrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channel).toBeNull();
  });
});

describe("useCreateChannel hook", () => {
  const createChannelMock = {
    request: {
      query: CREATE_CHANNEL,
      variables: {
        name: "new-channel",
        slug: "new-channel",
        description: "A new channel",
        type: "public",
        isPrivate: false,
        creatorId: "user1",
      },
    },
    result: {
      data: {
        insert_nchat_channels_one: {
          id: "3",
          name: "new-channel",
          slug: "new-channel",
          type: "public",
          __typename: "nchat_channels",
        },
      },
    },
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={[createChannelMock]}>{children}</MockedProvider>
  );

  it("provides createChannel function", () => {
    const { result } = renderHook(() => useCreateChannel(), { wrapper });

    expect(result.current.createChannel).toBeDefined();
    expect(typeof result.current.createChannel).toBe("function");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
