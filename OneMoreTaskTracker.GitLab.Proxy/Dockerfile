FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["OneMoreTaskTracker.GitLab.Proxy/OneMoreTaskTracker.GitLab.Proxy.csproj", "OneMoreTaskTracker.GitLab.Proxy/"]
RUN dotnet restore "OneMoreTaskTracker.GitLab.Proxy/OneMoreTaskTracker.GitLab.Proxy.csproj"
COPY . .
WORKDIR "/src/OneMoreTaskTracker.GitLab.Proxy"
RUN dotnet build "./OneMoreTaskTracker.GitLab.Proxy.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./OneMoreTaskTracker.GitLab.Proxy.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "OneMoreTaskTracker.GitLab.Proxy.dll"]
