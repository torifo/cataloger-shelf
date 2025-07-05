<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('opuses', function (Blueprint $table) {
            // ↓↓↓↓ ここから ↓↓↓↓
            $table->id();
            $table->string('title');
            $table->string('creator')->nullable();
            $table->enum('category', ['book', 'program', 'movie', 'other'])->comment('大分類');
            $table->string('sub_category')->nullable()->comment('小分類');
            $table->enum('status', ['completed', 'in_progress', 'planned'])->default('planned');
            $table->unsignedTinyInteger('rating')->nullable();
            $table->text('review')->nullable();
            $table->timestamps();
            // ↑↑↑↑ ここまで ↑↑↑↑
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opuses');
    }
};
