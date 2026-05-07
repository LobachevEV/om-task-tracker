using System.Text.Json;
using System.Text.Json.Serialization;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

public sealed class TristateIntJsonConverter : JsonConverter<Tristate<int>>
{
    public override bool HandleNull => true;

    public override Tristate<int>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return new Tristate<int>(IsPresent: true, Value: null);

        if (reader.TokenType == JsonTokenType.Number)
            return new Tristate<int>(IsPresent: true, Value: reader.GetInt32());

        throw new JsonException($"Expected null or integer, got {reader.TokenType}.");
    }

    public override void Write(Utf8JsonWriter writer, Tristate<int> value, JsonSerializerOptions options)
    {
        if (!value.IsPresent || value.Value is null)
            writer.WriteNullValue();
        else
            writer.WriteNumberValue(value.Value.Value);
    }
}
