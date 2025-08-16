from django.contrib.auth.models import User
from .models import MinesweeperGame
from rest_framework import serializers


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['username']

class MinesweeperGameSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = MinesweeperGame
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]

class InitializeGameSerializer(serializers.Serializer):
    width = serializers.IntegerField(required=False, default=8)
    height = serializers.IntegerField(required=False, default=8)
    mines = serializers.IntegerField(required=False, default=12)

class UpdateCellSerializer(serializers.Serializer):
    row = serializers.IntegerField(required=True)
    col = serializers.IntegerField(required=True)
    value = serializers.ChoiceField(
        choices=["toggle_flag", "reveal"],
        required=True
    )